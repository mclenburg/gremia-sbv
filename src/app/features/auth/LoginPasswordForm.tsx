import type { FormEvent } from "react";
import { AlertTriangle, Lock } from "lucide-react";
import { IndustrialButton } from "../../shared/components/IndustrialButton";
import { TextInput } from "../../shared/components/IndustrialForm";

interface LoginPasswordFormProps {
  isSetup: boolean;
  password: string;
  passwordRepeat: string;
  error: string;
  onPasswordChange: (value: string) => void;
  onRepeatChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function LoginPasswordForm({ isSetup, password, passwordRepeat, error, onPasswordChange, onRepeatChange, onSubmit }: LoginPasswordFormProps) {
  return (
    <form onSubmit={onSubmit} className="auth-form">
      <TextInput
        autoFocus
        type="password"
        label={isSetup ? "Initialpasswort" : "App-Passwort"}
        value={password}
        onValueChange={onPasswordChange}
        aria-label={isSetup ? "Initialpasswort" : "App-Passwort"}
        placeholder={isSetup ? "Initialpasswort festlegen" : "Passwort eingeben"}
        autoComplete={isSetup ? "new-password" : "current-password"}
      />

      {isSetup && (
        <TextInput
          type="password"
          label="Wiederholung"
          value={passwordRepeat}
          onValueChange={onRepeatChange}
          aria-label="Initialpasswort wiederholen"
          placeholder="Initialpasswort wiederholen"
          autoComplete="new-password"
        />
      )}

      {error && (
        <div className="industrial-message industrial-message-warning auth-inline-alert" role="alert">
          <AlertTriangle className="industrial-icon" />
          <p>{error}</p>
        </div>
      )}

      <IndustrialButton type="submit" wide>
        <Lock className="industrial-icon" />
        {isSetup ? "Initialpasswort speichern" : "Entsperren"}
      </IndustrialButton>
    </form>
  );
}
