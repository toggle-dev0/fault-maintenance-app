import { z } from "zod"

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ error: "Enter your current password." })
      .min(1, "Enter your current password.")
      .max(72, "Password must be 72 characters or fewer."),
    newPassword: z
      .string({ error: "Enter a new password." })
      .min(12, "At least 12 characters.")
      .max(72, "Password must be 72 characters or fewer."),
    confirmPassword: z
      .string({ error: "Confirm your new password." })
      .min(1, "Confirm your new password."),
  })
  .superRefine((values, context) => {
    if (
      values.confirmPassword &&
      values.confirmPassword !== values.newPassword
    ) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      })
    }

    if (
      values.newPassword &&
      values.currentPassword &&
      values.newPassword === values.currentPassword
    ) {
      context.addIssue({
        code: "custom",
        path: ["newPassword"],
        message:
          "The new password must be different from the current password.",
      })
    }
  })

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
export type PasswordField = keyof ChangePasswordValues

export type ChangePasswordResult = {
  fieldErrors?: Partial<Record<PasswordField, string>>
  error?: string
  success?: boolean
}
