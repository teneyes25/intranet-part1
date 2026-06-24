import { z } from "zod";

/// 회원가입 시 선택 가능한 소속 (관리자 승인 필요)
export const AFFILIATIONS = ["HEADQUARTER", "DEALER", "ADMIN"] as const;
export type Affiliation = (typeof AFFILIATIONS)[number];

export const loginSchema = z.object({
  email: z.string().email("올바른 이메일을 입력하세요."),
  password: z.string().min(1, "비밀번호를 입력하세요."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "이름은 2자 이상이어야 합니다."),
    email: z.string().email("올바른 이메일을 입력하세요."),
    password: z
      .string()
      .min(8, "비밀번호는 8자 이상이어야 합니다.")
      .max(72, "비밀번호가 너무 깁니다."),
    affiliation: z.enum(AFFILIATIONS, {
      message: "소속을 선택하세요.",
    }),
    dealerCode: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.affiliation === "DEALER" && !data.dealerCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dealerCode"],
        message: "대리점 코드를 입력하세요.",
      });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;
