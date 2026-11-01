import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TextField, type TextFieldProps } from "./TextField";

export function PasswordField(props: Omit<TextFieldProps, "type" | "trailing">) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <TextField
      icon={LockKeyhole}
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("auth.password.hide") : t("auth.password.show")}
          aria-pressed={visible}
          className="grid size-9 place-items-center rounded-lg text-fg-subtle transition-colors outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon className="size-[1.125rem]" aria-hidden="true" />
        </button>
      }
    />
  );
}
