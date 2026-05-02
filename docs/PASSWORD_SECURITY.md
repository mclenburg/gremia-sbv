# Passwortschutz

## Erster Start

Beim ersten Start erkennt Gremia.SBV, dass noch kein Passwort eingerichtet wurde. Die Anwendung zeigt deshalb die Maske **Initialpasswort festlegen** an.

Das Passwort muss mindestens 12 Zeichen lang sein. Nach erfolgreicher Einrichtung wird ein lokaler Passwortprüfwert unter `data/security.json` gespeichert.

## Normale Anmeldung

Nach der Ersteinrichtung zeigt die App nur noch die Entsperrmaske. Das Dashboard ist erst nach erfolgreicher Entsperrung sichtbar.

## Passwort ändern

Das Passwort kann in der App über **Einstellungen → Passwort ändern** geändert werden. Dafür ist das aktuelle Passwort erforderlich.

## Technischer Stand

Dieses Paket speichert kein Klartextpasswort. Für den Startschutz wird über Node.js `scrypt` ein Schlüssel aus Passwort und Salt abgeleitet; gespeichert wird nur ein daraus gebildeter Prüfwert.

Die spätere SQLCipher-Öffnung wird darauf aufbauen: Das App-Passwort soll dann nicht nur die Oberfläche entsperren, sondern auch die verschlüsselte Datenbank öffnen bzw. den Datenbankschlüssel schützen.
