export function validatePassword(password: string): string | null {
  if (password.length < 12) {
    return "Das Passwort muss mindestens 12 Zeichen lang sein.";
  }
  return null;
}
