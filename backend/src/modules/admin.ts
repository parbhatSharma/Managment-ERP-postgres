import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ok, AppError } from '../lib/http.js';
import { allow, authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async.js';

export const adminRouter = Router();
adminRouter.use(authenticate, allow(Role.ADMIN));

const person = z.object({
  email: z.string().email().transform(v => v.toLowerCase()),
  password: z.string().min(8),
  firstName: z.string().min(2).max(60),
  lastName: z.string().min(1).max(60),
  phone: z.string().max(30).optional(),
});

adminRouter.post('/students', asyncHandler(async (req, res) => {
  const input = person.extend({
    admissionNo: z.string().min(3).max(30), sectionId: z.string(),
    dateOfBirth: z.coerce.date().optional(), address: z.string().max(500).optional(),
    parentId: z.string().optional(), relationship: z.string().default('Guardian'),
  }).parse(req.body);
  const { password, admissionNo, sectionId, dateOfBirth, address, parentId, relationship, ...user } = input;
  const passwordHash = await bcrypt.hash(password, 12);
  const student = await prisma.$transaction(async tx => {
    const created = await tx.user.create({data:{...user,passwordHash,role:Role.STUDENT,student:{create:{admissionNo,sectionId,dateOfBirth,address}}},include:{student:true}});
    if(parentId) await tx.studentParent.create({data:{studentId:created.student!.id,parentId,relationship,isPrimary:true}});
    return created;
  });
  const {passwordHash: _, ...safe} = student; return res.status(201).json({success:true,data:safe});
}));

adminRouter.patch('/students/:id', asyncHandler(async (req,res)=>{
  const input=z.object({admissionNo:z.string().min(3).optional(),sectionId:z.string().nullable().optional(),status:z.enum(['ACTIVE','INACTIVE','GRADUATED','WITHDRAWN']).optional(),address:z.string().max(500).nullable().optional()}).parse(req.body);
  return ok(res,await prisma.student.update({where:{id:req.params.id},data:input}));
}));

adminRouter.post('/parents', asyncHandler(async(req,res)=>{
  const input=person.extend({occupation:z.string().max(120).optional()}).parse(req.body); const {password,...user}=input;
  const created=await prisma.user.create({data:{...user,passwordHash:await bcrypt.hash(password,12),role:Role.PARENT,parent:{create:{occupation:input.occupation}}},include:{parent:true}});
  const {passwordHash:_,...safe}=created; return res.status(201).json({success:true,data:safe});
}));

adminRouter.post('/teachers', asyncHandler(async(req,res)=>{
  const input=person.extend({employeeNo:z.string().min(3),qualification:z.string().max(160).optional()}).parse(req.body); const {password,employeeNo,qualification,...user}=input;
  const created=await prisma.user.create({data:{...user,passwordHash:await bcrypt.hash(password,12),role:Role.TEACHER,teacher:{create:{employeeNo,qualification}}},include:{teacher:true}});
  const {passwordHash:_,...safe}=created; return res.status(201).json({success:true,data:safe});
}));

adminRouter.patch('/teachers/:id', asyncHandler(async(req,res)=>{
  const input=z.object({qualification:z.string().max(160).nullable().optional(),employeeNo:z.string().min(3).optional()}).parse(req.body);
  return ok(res,await prisma.teacher.update({where:{id:req.params.id},data:input}));
}));

adminRouter.post('/classes', asyncHandler(async(req,res)=>{
  const input=z.object({name:z.string().min(1).max(50),sortOrder:z.number().int(),sections:z.array(z.string().min(1).max(10)).default([])}).parse(req.body);
  return res.status(201).json({success:true,data:await prisma.schoolClass.create({data:{name:input.name,sortOrder:input.sortOrder,sections:{create:input.sections.map(name=>({name}))}},include:{sections:true}})});
}));
adminRouter.post('/sections', asyncHandler(async(req,res)=>{const input=z.object({classId:z.string(),name:z.string().min(1).max(10),capacity:z.number().int().min(1).max(100).default(40),classTeacherId:z.string().optional()}).parse(req.body);return res.status(201).json({success:true,data:await prisma.section.create({data:input})})}));
adminRouter.post('/subjects', asyncHandler(async(req,res)=>{const input=z.object({code:z.string().min(2),name:z.string().min(2),color:z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#2783DE')}).parse(req.body);return res.status(201).json({success:true,data:await prisma.subject.create({data:input})})}));
adminRouter.post('/teacher-subjects', asyncHandler(async(req,res)=>{const input=z.object({teacherId:z.string(),subjectId:z.string(),sectionId:z.string()}).parse(req.body);return res.status(201).json({success:true,data:await prisma.teacherSubject.create({data:input})})}));
adminRouter.post('/timetable', asyncHandler(async(req,res)=>{const input=z.object({sectionId:z.string(),subjectId:z.string(),teacherId:z.string(),day:z.enum(['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY']),period:z.number().int().positive(),startsAt:z.string().regex(/^\d{2}:\d{2}$/),endsAt:z.string().regex(/^\d{2}:\d{2}$/),room:z.string().max(30).optional()}).parse(req.body);return res.status(201).json({success:true,data:await prisma.timetableEntry.create({data:input})})}));
adminRouter.post('/fees', asyncHandler(async(req,res)=>{const input=z.object({studentId:z.string(),label:z.string().min(2),amount:z.number().positive(),dueDate:z.coerce.date()}).parse(req.body);return res.status(201).json({success:true,data:await prisma.feeRecord.create({data:input})})}));
adminRouter.post('/fees/:id/payments', asyncHandler(async(req,res)=>{const input=z.object({amount:z.number().positive(),method:z.string().min(2),reference:z.string().optional()}).parse(req.body);const fee=await prisma.feeRecord.findUnique({where:{id:req.params.id}});if(!fee)throw new AppError(404,'Fee record not found');const payment=await prisma.$transaction(async tx=>{const p=await tx.feePayment.create({data:{...input,feeRecordId:fee.id}});const paid=Number(fee.amountPaid)+input.amount;await tx.feeRecord.update({where:{id:fee.id},data:{amountPaid:paid,status:paid>=Number(fee.amount)?'PAID':'PARTIAL'}});return p});return res.status(201).json({success:true,data:payment})}));
adminRouter.delete('/:resource/:id', asyncHandler(async(req,res)=>{const id=req.params.id;const actions:Record<string,()=>Promise<unknown>>={students:()=>prisma.student.delete({where:{id}}),teachers:()=>prisma.teacher.delete({where:{id}}),sections:()=>prisma.section.delete({where:{id}}),subjects:()=>prisma.subject.delete({where:{id}}),announcements:()=>prisma.announcement.delete({where:{id}}),assignments:()=>prisma.assignment.delete({where:{id}}),fees:()=>prisma.feeRecord.delete({where:{id}})};const action=actions[req.params.resource];if(!action)throw new AppError(404,'Unsupported resource');await action();return ok(res,{deleted:true})}));
