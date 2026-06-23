import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(1, '아이디를 입력하세요').max(50),
  password: z.string().min(1, '비밀번호를 입력하세요').max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
