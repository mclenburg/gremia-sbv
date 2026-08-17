export const MIN_PASSWORD_LENGTH = 12;

const TRIPLE_REPEATED_CHARACTER = /(.)\1\1/u;

export function hasMoreThanTwoIdenticalCharactersInARow(value: string): boolean {
  return TRIPLE_REPEATED_CHARACTER.test(value);
}

export function validateAppPassword(password: string): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`;
  }

  if (hasMoreThanTwoIdenticalCharactersInARow(password)) {
    return "Das Passwort darf nicht mehr als zwei identische Zeichen direkt hintereinander enthalten.";
  }

  return null;
}
