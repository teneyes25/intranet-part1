import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("올바른 이메일을 입력하세요."),
  password: z.string().min(1, "비밀번호를 입력하세요."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(2, "이름은 2자 이상이어야 합니다."),
  email: z.string().email("올바른 이메일을 입력하세요."),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다.")
    .max(72, "비밀번호가 너무 깁니다."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
