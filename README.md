# Gmail AI Assistant Add-on

Ein Gmail Add-on, das KI-generierte E-Mail-Antworten mit OpenAI Assistant API erstellt.

## Features

- **✨ KI-Antwort Button**: Prominent in der Compose-Toolbar neben dem "Senden"-Button
- **Intelligente Texteinfügung**: Fügt KI-generierten Text direkt in offene Antwort-Fenster ein
- **Thread-Kontext**: Berücksichtigt die gesamte E-Mail-Historie für kontextbezogene Antworten
- **Duplikatschutz**: 3-Stufen-Sicherheitssystem verhindert versehentliche Mehrfachausführungen
- **Konfigurierbar**: OpenAI API Key und Assistant ID können individuell eingestellt werden
- **Sicher**: Antworten werden NICHT automatisch versendet - du behältst die volle Kontrolle

## Voraussetzungen

1. **Google Account** mit Gmail
2. **OpenAI Account** mit:
   - API Key (beginnt mit `sk-...`)
   - Einen konfigurierten Assistant (ID beginnt mit `asst_...`)

## Installation & Deployment

### Schritt 1: Projekt in Apps Script erstellen

1. Gehe zu [script.google.com](https://script.google.com)
2. Klicke auf **"Neues Projekt"**
3. Benenne das Projekt: "Gmail AI Assistant"

### Schritt 2: Code einfügen

1. Lösche den vorhandenen Code in `Code.gs`
2. Kopiere den Inhalt aus `Code.gs` dieses Projekts
3. Klicke auf das **Projekt-Icon** (links) → **Übersicht**
4. Klicke auf **Projekteinstellungen**
5. Aktiviere **"appsscript.json"-Manifest-Datei im Editor anzeigen**
6. Gehe zurück zum **Editor**
7. Öffne die neue `appsscript.json` Datei
8. Ersetze den Inhalt mit dem `appsscript.json` aus diesem Projekt
9. Klicke auf **Speichern** (Disketten-Symbol)

### Schritt 3: Google Cloud Projekt verknüpfen

1. Im Apps Script Editor: Klicke auf **Projekteinstellungen** (Zahnrad-Symbol)
2. Unter "Google Cloud Platform (GCP) Project":
   - Option 1: Klicke auf **GCP-Projektnummer ändern** und erstelle ein neues Projekt
   - Option 2: Verwende ein bestehendes GCP-Projekt
3. Notiere die Projektnummer

### Schritt 4: OAuth Consent Screen konfigurieren

1. Gehe zur [Google Cloud Console](https://console.cloud.google.com)
2. Wähle dein Projekt aus
3. Navigiere zu **APIs & Services** → **OAuth consent screen**
4. Wähle **Internal** (für Domain-User) oder **External**
5. Fülle die erforderlichen Felder aus:
   - App name: "Gmail AI Assistant"
   - User support email: Deine E-Mail
   - Developer contact: Deine E-Mail
6. Klicke auf **Save and Continue**
7. Bei Scopes: Klicke **Save and Continue** (Scopes werden automatisch hinzugefügt)
8. Klicke auf **Back to Dashboard**

### Schritt 5: Test Deployment

1. Im Apps Script Editor: Klicke auf **Deploy** → **Test deployments**
2. Klicke auf **Install**
3. Wähle dein Google Account aus
4. Akzeptiere die Berechtigungen
5. Das Add-on sollte jetzt in Gmail verfügbar sein

### Schritt 6: Konfiguration in Gmail

1. Öffne Gmail
2. Öffne eine beliebige E-Mail
3. Rechts in der Sidebar solltest du das Gmail-Icon sehen
4. Klicke auf das Add-on
5. Klicke auf **"Einstellungen öffnen"** oder **"⚙️ Einstellungen"**
6. Trage ein:
   - **OpenAI API Key**: Dein API Key von [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - **OpenAI Assistant ID**: Die ID deines Assistants von [platform.openai.com/assistants](https://platform.openai.com/assistants)
7. Klicke auf **Speichern**

## Verwendung

### KI-Antwort einfügen

1. Öffne eine E-Mail in Gmail
2. Klicke auf **"Antworten"** oder erstelle eine neue E-Mail
3. In der Compose-Toolbar siehst du den Button **"✨ KI-Antwort"** direkt neben "Senden"
4. Klicke auf **"✨ KI-Antwort"**
5. Die KI generiert Text basierend auf dem E-Mail-Thread
6. Der Text wird automatisch in dein Compose-Fenster eingefügt
7. Bearbeite den Text nach Bedarf
8. Klicke auf **"Senden"** wenn du zufrieden bist

**Hinweise:**
- Der Button erscheint nur in Compose/Reply-Fenstern
- Die KI berücksichtigt den kompletten E-Mail-Thread für den Kontext
- Die zu beantwortende E-Mail wird automatisch erkannt und markiert

## OpenAI Assistant Setup

### Einen Assistant erstellen

1. Gehe zu [platform.openai.com/assistants](https://platform.openai.com/assistants)
2. Klicke auf **"Create"**
3. Konfiguriere den Assistant:
   - **Name**: "Email Assistant"
   - **Instructions**:
     ```
     Du bist ein professioneller E-Mail-Assistent.
     Erstelle höfliche, klare und professionelle E-Mail-Antworten basierend auf dem gegebenen E-Mail-Thread.
     Behalte einen angemessenen, freundlichen Ton bei und gehe auf alle wichtigen Punkte der vorherigen E-Mails ein.
     Schreibe auf Deutsch, falls die E-Mails auf Deutsch sind.
     Erstelle ausschließlich den Mail-Text, keinen Betreff, keine Rückfragen!
     ```
   - **Model**: gpt-4o oder gpt-4-turbo
4. Klicke auf **"Create"**
5. Kopiere die **Assistant ID** (beginnt mit `asst_...`)

## Technische Details

### 3-Stufen-Duplikatschutz

Das Add-on verwendet ein robustes System gegen versehentliche Mehrfachausführungen:

1. **Cache-Service**: Extrem schnelle erste Prüfung (15 Sekunden Blockierung)
2. **Lock-Service**: Verhindert parallele Ausführung
3. **Properties-Service**: Persistente Speicherung der letzten Ausführung

Dies verhindert, dass Gmail-interne Mehrfachaufrufe zu doppelten Texteinfügungen führen.

### Verwendete OAuth Scopes

- `gmail.addons.execute` - Add-on Ausführung
- `gmail.addons.current.message.metadata` - Metadaten der Nachricht (Subject, Empfänger)
- `gmail.addons.current.action.compose` - Compose-Actions und Draft-Updates
- `gmail.readonly` - Gmail lesen (Thread-Suche und Nachrichten)
- `gmail.compose` - Compose-Fenster bearbeiten
- `script.external_request` - OpenAI API Aufrufe

## Troubleshooting

### "Konfiguration erforderlich"
- Stelle sicher, dass API Key und Assistant ID in den Einstellungen eingetragen sind
- Überprüfe, dass der API Key gültig ist

### "Keine Antwort von der KI erhalten"
- Überprüfe, ob der Assistant in OpenAI noch existiert
- Stelle sicher, dass du genug OpenAI Credits hast
- Prüfe die Apps Script Logs: **Ausführungen** im Menü

### "Timeout: Assistant hat zu lange gebraucht"
- Der Assistant braucht > 30 Sekunden
- Reduziere die Komplexität der Assistant Instructions
- Verwende ein schnelleres Model (gpt-4o-mini)

### Text wird doppelt eingefügt
- Das 3-Stufen-Sicherheitssystem sollte dies verhindern
- Falls es trotzdem passiert: Warte 15 Sekunden vor erneutem Klick
- Prüfe die Logs auf Fehler

### Button "✨ KI-Antwort" erscheint nicht
- Stelle sicher, dass du in einem Compose/Reply-Fenster bist
- Aktualisiere Gmail (F5)
- Deinstalliere und installiere das Test Deployment neu

### "Kein passender E-Mail-Thread gefunden"
- Das Add-on sucht nach dem Thread über Subject + Empfänger
- Bei neuen E-Mails (ohne Historie) kann dieser Fehler auftreten
- Workaround: Antworte auf eine bestehende E-Mail statt neue zu erstellen

### Berechtigungen werden nicht angefordert
- Lösche das Test Deployment und erstelle es neu
- Gehe zu [myaccount.google.com/permissions](https://myaccount.google.com/permissions) und entferne das Add-on
- Installiere das Test Deployment erneut

## Sicherheit & Datenschutz

- API Keys werden in **Google User Properties** gespeichert (verschlüsselt)
- E-Mail-Inhalte werden nur an OpenAI gesendet (siehe OpenAI Privacy Policy)
- Keine Daten werden auf anderen Servern gespeichert
- Das Add-on hat nur Lesezugriff auf die aktuelle E-Mail und Compose-Zugriff
- Antworten werden NIE automatisch versendet - du behältst die volle Kontrolle

## Deployment für Team/Domain

### Domain-weites Deployment

1. Im Apps Script Editor: **Deploy** → **New deployment**
2. Wähle **Type**: "Add-on"
3. **Configuration**:
   - Name: "Gmail AI Assistant"
   - Description: "KI-generierte E-Mail-Antworten"
4. **Visibility**: Wähle deine Domain oder spezifische User
5. Klicke auf **Deploy**

### Für Google Workspace Admin

1. Gehe zur [Google Workspace Admin Console](https://admin.google.com)
2. Navigiere zu **Apps** → **Google Workspace Marketplace apps**
3. Klicke auf **Add app** → **Add custom app**
4. Füge die **Deployment ID** ein (aus Apps Script)
5. Wähle die Organisationseinheiten aus
6. Klicke auf **Install**

## Lizenz

MIT License - Frei verwendbar für private und kommerzielle Zwecke

## Support

Bei Fragen oder Problemen:
- Prüfe die [Google Apps Script Dokumentation](https://developers.google.com/apps-script)
- Prüfe die [OpenAI API Dokumentation](https://platform.openai.com/docs)
- Überprüfe die Apps Script Logs für Fehlermeldungen

## Changelog

### Version 1.1
- Button "✨ KI-Antwort" direkt in Compose-Toolbar (statt Menü)
- Entfernung der "KI-Antwort generieren" Funktion aus Sidebar
- 3-Stufen-Duplikatschutz implementiert (Cache + Lock + Properties)
- Fokus auf Texteinfügung in bereits geöffnete Compose-Fenster
- Verbesserte Fehlerbehandlung und Logging

### Version 1.0
- Initiales Release
- Thread-basierte KI-Antworten mit OpenAI Assistant API
- Konfigurierbare Settings
