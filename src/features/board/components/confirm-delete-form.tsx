"use client";

interface ConfirmDeleteFormProps {
  action: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  message?: string;
  className?: string;
}

export function ConfirmDeleteForm({
  action,
  children,
  message = "정말 삭제하시겠습니까?",
  className,
}: ConfirmDeleteFormProps) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
