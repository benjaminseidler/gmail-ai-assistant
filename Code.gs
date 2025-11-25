/**
 * Gmail AI Assistant Add-on
 * Generiert KI-basierte E-Mail-Antworten mit OpenAI Assistant API
 */

// Properties Keys
var PROPERTY_API_KEY = 'OPENAI_API_KEY';
var PROPERTY_ASSISTANT_ID = 'OPENAI_ASSISTANT_ID';
var PROPERTY_MODEL_TYPE = 'OPENAI_MODEL_TYPE'; // 'nano' oder 'mini'

/**
 * Erstellt die Haupt-Card beim Öffnen einer E-Mail
 */
function buildMessageCard(e) {
  var apiKey = getUserProperty(PROPERTY_API_KEY);
  var assistantId = getUserProperty(PROPERTY_ASSISTANT_ID);
  var modelType = getUserProperty(PROPERTY_MODEL_TYPE) || 'nano';

  var card = CardService.newCardBuilder();
  card.setHeader(CardService.newCardHeader()
    .setTitle('AI Email Assistant')
    .setImageUrl('https://www.gstatic.com/images/branding/product/1x/gmail_512dp.png'));

  // Status-Section
  var statusSection = CardService.newCardSection();

  if (!apiKey || !assistantId) {
    statusSection.addWidget(CardService.newTextParagraph()
      .setText('<font color="#EA4335"><b>⚠️ Konfiguration erforderlich</b></font><br>' +
               'Bitte konfiguriere zuerst deinen OpenAI API Key und Assistant ID in den Einstellungen.'));

    statusSection.addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText('Einstellungen öffnen')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('showSettings'))));
  } else {
    var modelLabel = (modelType === 'nano') ? '⚡ Ultra-Schnell (gpt-4.1-nano)' : '🎯 Schnell (gpt-4.1-mini)';
    var timeEstimate = (modelType === 'nano') ? '2-5 Sekunden' : '3-8 Sekunden';

    statusSection.addWidget(CardService.newTextParagraph()
      .setText('<font color="#34A853">✓ Konfiguriert</font><br>' +
               'Assistant ID: ' + assistantId.substring(0, 20) + '...<br>' +
               'Modell: ' + modelLabel));

    statusSection.addWidget(CardService.newTextParagraph()
      .setText('<br><b>Verwendung:</b><br>' +
               '1. Öffne oder erstelle eine neue/Antwort-Mail<br>' +
               '2. Klicke auf "✨ KI-Antwort" im Compose-Fenster<br>' +
               '3. Gib Stichpunkte ein (<strong>Pflicht für neue E-Mails</strong>)<br>' +
               '4. Klicke "Generieren" und warte ' + timeEstimate));

    // Einstellungen-Button
    statusSection.addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText('⚙️ Einstellungen')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('showSettings'))));
  }

  card.addSection(statusSection);

  return card.build();
}

/**
 * Zeigt den Settings-Dialog
 */
function showSettings(e) {
  var apiKey = getUserProperty(PROPERTY_API_KEY) || '';
  var assistantId = getUserProperty(PROPERTY_ASSISTANT_ID) || '';
  var modelType = getUserProperty(PROPERTY_MODEL_TYPE) || 'nano';

  var card = CardService.newCardBuilder();
  card.setHeader(CardService.newCardHeader()
    .setTitle('Einstellungen')
    .setSubtitle('OpenAI API Konfiguration'));

  var section = CardService.newCardSection();

  section.addWidget(CardService.newTextParagraph()
    .setText('Konfiguriere deine OpenAI API Zugangsdaten:'));

  section.addWidget(CardService.newTextInput()
    .setFieldName('apiKey')
    .setTitle('OpenAI API Key')
    .setValue(apiKey ? '••••••••' + apiKey.slice(-4) : '')
    .setHint('sk-...'));

  section.addWidget(CardService.newTextInput()
    .setFieldName('assistantId')
    .setTitle('OpenAI Assistant ID')
    .setValue(assistantId)
    .setHint('asst_...'));

  // Model Type Selection
  section.addWidget(CardService.newDecoratedText()
    .setTopLabel('KI-Modell')
    .setText('Wähle die Geschwindigkeit'));

  section.addWidget(CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.RADIO_BUTTON)
    .setFieldName('modelType')
    .addItem('⚡ Ultra-Schnell (gpt-4.1-nano) - 2-5s', 'nano', modelType === 'nano')
    .addItem('🎯 Schnell (gpt-4.1-mini) - 3-8s', 'mini', modelType === 'mini'));

  section.addWidget(CardService.newTextParagraph()
    .setText('<font color="#5F6368"><i>Deine Zugangsdaten werden sicher in deinem Google Account gespeichert.<br><br>' +
             'Hinweis: Das gewählte Modell überschreibt die Konfiguration in deinem OpenAI Assistant.</i></font>'));

  var buttonSet = CardService.newButtonSet()
    .addButton(CardService.newTextButton()
      .setText('Speichern')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setBackgroundColor('#34A853')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('saveSettings')));

  section.addWidget(buttonSet);

  card.addSection(section);

  return card.build();
}

/**
 * Speichert die Einstellungen
 */
function saveSettings(e) {
  var apiKey = e.formInput.apiKey;
  var assistantId = e.formInput.assistantId;
  var modelType = e.formInput.modelType || 'nano';

  // Nur aktualisieren wenn nicht maskiert
  if (apiKey && !apiKey.startsWith('••••')) {
    setUserProperty(PROPERTY_API_KEY, apiKey);
  }

  if (assistantId) {
    setUserProperty(PROPERTY_ASSISTANT_ID, assistantId);
  }

  setUserProperty(PROPERTY_MODEL_TYPE, modelType);

  var modelLabel = (modelType === 'nano') ? '⚡ Ultra-Schnell' : '🎯 Schnell';
  var notification = CardService.newNotification()
    .setText('✓ Einstellungen gespeichert (' + modelLabel + ')');

  return CardService.newActionResponseBuilder()
    .setNotification(notification)
    .setNavigation(CardService.newNavigation().popCard())
    .build();
}

/**
 * Zeigt Dialog für Stichpunkte-Eingabe
 * Optimiert: Lädt Metadaten erst beim Klick auf "Generieren" (Lazy Loading)
 */
function insertAITextToCompose(e) {
  // Zeige Dialog sofort - OHNE Metadaten zu extrahieren
  // Performance-Optimierung: Dialog öffnet sich instant ohne Gmail API Calls
  var card = CardService.newCardBuilder();
  card.setHeader(CardService.newCardHeader()
    .setTitle('KI-Mail generieren'));

  var section = CardService.newCardSection();

  section.addWidget(CardService.newTextParagraph()
    .setText('Beschreibe kurz, was die E-Mail enthalten soll.'));

  section.addWidget(CardService.newTextInput()
    .setFieldName('userNotes')
    .setTitle('📝 Stichpunkte (optional)')
    .setHint('Z.B.: Termin am Freitag 14 Uhr zusagen')
    .setMultiline(true)
    .setValue(''));

  section.addWidget(CardService.newTextParagraph()
    .setText('<font color="#5f6368"><i>💡 Tipp: Bei neuen E-Mails entweder Betreff oder Stichpunkte angeben</i></font>'));

  section.addWidget(CardService.newButtonSet()
    .addButton(CardService.newTextButton()
      .setText('✨ Generieren')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setBackgroundColor('#1967d2')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('generateAIResponse')
        .setLoadIndicator(CardService.LoadIndicator.SPINNER))));
  card.addSection(section);

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card.build()))
    .build();
}

/**
 * Generiert KI-Antwort mit optionalen Stichpunkten
 * Optimiert: Extrahiert Metadaten lazy aus Event-Objekt
 */
function generateAIResponse(e) {
  try {
    var threadId = null;

    // Performance-Optimierung: Lade Metadaten erst jetzt (nicht beim Dialog-Öffnen)
    var subject = '';
    var toRecipient = '';

    // Versuche Subject zu extrahieren
    if (e.gmail && e.gmail.subject) {
      subject = e.gmail.subject;
    } else if (e.draftMetadata && e.draftMetadata.subject) {
      subject = e.draftMetadata.subject;
    }

    // Versuche Empfänger zu extrahieren
    if (e.gmail && e.gmail.toRecipients && e.gmail.toRecipients.length > 0) {
      toRecipient = e.gmail.toRecipients[0];
    } else if (e.draftMetadata && e.draftMetadata.toRecipients && e.draftMetadata.toRecipients.length > 0) {
      toRecipient = e.draftMetadata.toRecipients[0];
    }

    var existingDraftContent = e.formInput.userNotes || '';

    Logger.log('=== KI-Antwort-Generierung gestartet ===');
    Logger.log('Subject: ' + subject);
    Logger.log('To: ' + toRecipient);
    if (existingDraftContent.length > 0) {
      Logger.log('Mit Stichpunkten: "' + existingDraftContent + '"');
    } else {
      Logger.log('Ohne Stichpunkte');
    }

    // Erstelle eindeutigen Request-Key
    var requestKey = 'REQ_' + Utilities.base64Encode(subject + '|' + toRecipient);
    var now = new Date().getTime();

    // ERSTE PRÜFUNG: Cache-basierte schnelle Duplikatsprüfung (sofort am Anfang!)
    var cache = CacheService.getUserCache();
    var lastRequestTime = cache.get(requestKey);

    if (lastRequestTime) {
      var timeSince = now - parseInt(lastRequestTime);
      if (timeSince < 15000) { // 15 Sekunden Blockierung
        Logger.log('Duplikat-Anfrage blockiert (vor ' + timeSince + 'ms bereits gestartet)');
        throw new Error('DUPLICATE_REQUEST_IGNORED');
      }
    }

    // Markiere diese Anfrage sofort im Cache (15 Sekunden gültig)
    cache.put(requestKey, now.toString(), 15);

    // ZWEITE PRÜFUNG: Lock-basierte Duplikatsprüfung
    var lock = LockService.getUserLock();
    var hasLock = lock.tryLock(30000);

    if (!hasLock) {
      Logger.log('Lock nicht erhalten - andere Anfrage läuft bereits');
      throw new Error('DUPLICATE_REQUEST_IGNORED');
    }

    try {
      // DRITTE PRÜFUNG: Properties-basierte persistente Prüfung
      var userProps = PropertiesService.getUserProperties();
      var lastProcessed = userProps.getProperty(requestKey);

      if (lastProcessed) {
        var timeSinceLastProcess = now - parseInt(lastProcessed);
        if (timeSinceLastProcess < 15000) { // 15 Sekunden
          Logger.log('Properties-Check: Anfrage vor ' + timeSinceLastProcess + 'ms bereits verarbeitet - IGNORIERE');
          lock.releaseLock();
          throw new Error('DUPLICATE_REQUEST_IGNORED');
        }
      }

      // Markiere Anfrage als verarbeitet
      userProps.setProperty(requestKey, now.toString());

      var aiResponse = null;

      // Versuche Thread über Subject und Empfänger zu finden (nur wenn beide vorhanden)
      if (subject && toRecipient) {
        // Entferne "Re: " vom Subject für die Suche
        var cleanSubject = subject.replace(/^Re:\s*/i, '').trim();

        // Suche nach Thread mit diesem Subject und Empfänger
        var searchQuery = 'subject:"' + cleanSubject + '" (to:' + toRecipient + ' OR from:' + toRecipient + ')';
        Logger.log('Suche mit Query: ' + searchQuery);

        var threads = GmailApp.search(searchQuery, 0, 5);

        if (threads.length > 0) {
          // ANTWORT-MODUS: Thread gefunden
          threadId = threads[0].getId();
          Logger.log('Thread gefunden: ' + threadId);

          // Lade Thread-Historie
          var thread = GmailApp.getThreadById(threadId);
          var messages = thread.getMessages();

          if (messages.length === 0) {
            throw new Error('Thread enthält keine Nachrichten');
          }

          var threadHistory = extractThreadHistory(messages);

          // Verwende die letzte Nachricht im Thread
          var lastMessage = messages[messages.length - 1];

          Logger.log('Verwende Nachricht: ' + lastMessage.getId() + ' von ' + lastMessage.getFrom());
          Logger.log('Generiere KI-Antwort...');

          // Generiere KI-Antwort mit der letzten Nachricht und optionalen Entwurfs-Hinweisen
          aiResponse = getAIResponseForMessage(threadHistory, lastMessage.getId(), existingDraftContent);

          if (!aiResponse) {
            throw new Error('Keine Antwort von der KI erhalten');
          }

        } else {
          // NEUE E-MAIL MODUS: Kein Thread gefunden
          Logger.log('=== NEUE E-MAIL ERKANNT (kein Thread gefunden) ===');
          Logger.log('Empfänger: ' + toRecipient);
          Logger.log('Betreff: ' + subject);
          Logger.log('Stichpunkte: ' + existingDraftContent);

          // Validierung: Entweder Stichpunkte ODER Betreff muss vorhanden sein
          var hasNotes = existingDraftContent && existingDraftContent.trim().length > 0;
          var hasSubject = subject && subject.trim().length > 0;

          if (!hasNotes && !hasSubject) {
            throw new Error('MISSING_CONTENT_NEW_EMAIL');
          }

          // Generiere neue E-Mail ohne Thread-Historie
          aiResponse = generateNewEmailContent(toRecipient, subject, existingDraftContent);

          if (!aiResponse) {
            throw new Error('Keine Antwort von der KI erhalten');
          }
        }

      } else {
        // NEUE E-MAIL MODUS: Subject oder Empfänger fehlt - überspringe Thread-Suche
        Logger.log('=== NEUE E-MAIL ERKANNT (Subject/Empfänger fehlt) ===');
        Logger.log('Empfänger: ' + (toRecipient || '(leer)'));
        Logger.log('Betreff: ' + (subject || '(leer)'));
        Logger.log('Stichpunkte: ' + existingDraftContent);

        // Validierung: Entweder Stichpunkte ODER Betreff muss vorhanden sein
        var hasNotes = existingDraftContent && existingDraftContent.trim().length > 0;
        var hasSubject = subject && subject.trim().length > 0;

        if (!hasNotes && !hasSubject) {
          throw new Error('MISSING_CONTENT_NEW_EMAIL');
        }

        // Generiere neue E-Mail ohne Thread-Historie
        aiResponse = generateNewEmailContent(toRecipient, subject, existingDraftContent);

        if (!aiResponse) {
          throw new Error('Keine Antwort von der KI erhalten');
        }
      }

      // Gemeinsamer Code für alle Modi: Konvertiere und füge ein
      var htmlResponse = aiResponse.replace(/\n/g, '<br>');

      // Füge Text in Compose-Dialog ein
      var updateDraftAction = CardService.newUpdateDraftActionResponseBuilder()
        .setUpdateDraftBodyAction(CardService.newUpdateDraftBodyAction()
          .addUpdateContent(htmlResponse, CardService.ContentType.MUTABLE_HTML)
          .setUpdateType(CardService.UpdateDraftBodyType.IN_PLACE_INSERT))
        .build();

      // Gebe Lock frei
      lock.releaseLock();

      Logger.log('KI-Text erfolgreich eingefügt');
      return updateDraftAction;

    } finally {
      // Stelle sicher, dass Lock immer freigegeben wird
      if (lock) {
        try {
          lock.releaseLock();
        } catch (lockError) {
          Logger.log('Fehler beim Freigeben des Locks: ' + lockError);
        }
      }
    }

  } catch (error) {
    // Bei Fehlern: Zeige Fehlermeldung
    Logger.log('Fehler in insertAITextToCompose: ' + error.message);

    // Bei doppelten Anfragen: Stille Rückgabe ohne sichtbare Nachricht
    if (error.message === 'DUPLICATE_REQUEST_IGNORED') {
      Logger.log('Doppelte Anfrage ignoriert - keine Ausgabe');
      var updateDraftAction = CardService.newUpdateDraftActionResponseBuilder()
        .setUpdateDraftBodyAction(CardService.newUpdateDraftBodyAction()
          .addUpdateContent(' ', CardService.ContentType.MUTABLE_HTML)
          .setUpdateType(CardService.UpdateDraftBodyType.IN_PLACE_INSERT))
        .build();
      return updateDraftAction;
    }

    // Spezielle Behandlung für fehlenden Inhalt bei neuen E-Mails
    if (error.message === 'MISSING_CONTENT_NEW_EMAIL') {
      Logger.log('Neue E-Mail ohne Betreff und Stichpunkte - zeige Hinweis');
      var errorMessage = '<div style="background-color: #fef7e0; border-left: 4px solid #f4b400; padding: 12px; margin: 8px 0;">' +
                         '<strong style="color: #c5221f;">⚠️ Inhalt erforderlich</strong><br><br>' +
                         'Für neue E-Mails wird mindestens eines benötigt:<br>' +
                         '• Ein aussagekräftiger Betreff (z.B. "Urlaubsantrag Juli")<br>' +
                         '• Stichpunkte im Dialog<br><br>' +
                         '<strong>So geht\'s:</strong><br>' +
                         '1. Gib einen Betreff ein ODER<br>' +
                         '2. Klicke "✨ KI-Antwort" und gib Stichpunkte ein<br>' +
                         '3. Beispiel: "Anfrage für Meeting, Termin nächste Woche"' +
                         '</div>';

      var updateDraftAction = CardService.newUpdateDraftActionResponseBuilder()
        .setUpdateDraftBodyAction(CardService.newUpdateDraftBodyAction()
          .addUpdateContent(errorMessage, CardService.ContentType.MUTABLE_HTML)
          .setUpdateType(CardService.UpdateDraftBodyType.IN_PLACE_INSERT))
        .build();
      return updateDraftAction;
    }

    // Bei echten Fehlern: Zeige aussagekräftige Fehlermeldung
    var errorMessage = '<div style="background-color: #fef7e0; border-left: 4px solid #f4b400; padding: 12px; margin: 8px 0;">' +
                       '<strong style="color: #c5221f;">⚠️ KI-Antwort konnte nicht erstellt werden</strong><br><br>' +
                       '<strong>Fehler:</strong> ' + error.message + '<br><br>' +
                       '<em style="color: #5f6368;">Tipp: Prüfe deine Einstellungen und versuche es erneut.</em>' +
                       '</div>';

    var updateDraftAction = CardService.newUpdateDraftActionResponseBuilder()
      .setUpdateDraftBodyAction(CardService.newUpdateDraftBodyAction()
        .addUpdateContent(errorMessage, CardService.ContentType.MUTABLE_HTML)
        .setUpdateType(CardService.UpdateDraftBodyType.IN_PLACE_INSERT))
      .build();

    return updateDraftAction;
  }
}

/**
 * Extrahiert Thread-Historie für KI-Kontext
 * Optimiert: Nur die letzten 3 Nachrichten für bessere Performance
 */
function extractThreadHistory(messages) {
  var history = [];

  // Performance-Optimierung: Nur letzte 3 Nachrichten verwenden
  // Reduziert Token-Count und API-Latenz erheblich
  var startIndex = Math.max(0, messages.length - 3);

  for (var i = startIndex; i < messages.length; i++) {
    var msg = messages[i];
    history.push({
      id: msg.getId(),
      from: msg.getFrom(),
      date: msg.getDate().toISOString(),
      subject: msg.getSubject(),
      body: msg.getPlainBody().substring(0, 1500) // Reduziert von 2000 auf 1500
    });
  }

  Logger.log('Thread-Historie: ' + history.length + ' Nachrichten (von ' + messages.length + ' gesamt)');

  return history;
}

/**
 * Ruft OpenAI Assistant API auf - für spezifische Nachricht
 */
function getAIResponseForMessage(threadHistory, targetMessageId, userNotes) {
  var apiKey = getUserProperty(PROPERTY_API_KEY);
  var assistantId = getUserProperty(PROPERTY_ASSISTANT_ID);

  if (!apiKey || !assistantId) {
    throw new Error('API Key oder Assistant ID nicht konfiguriert');
  }

  // Erstelle Thread bei OpenAI
  var threadResponse = createOpenAIThread(apiKey);
  var threadId = threadResponse.id;

  // Erstelle Kontext-Nachricht mit Markierung der zu beantwortenden Mail
  var contextMessage = 'E-Mail Thread Historie:\n\n';
  var targetIndex = -1;

  for (var i = 0; i < threadHistory.length; i++) {
    var isTarget = (threadHistory[i].id === targetMessageId);
    if (isTarget) targetIndex = i + 1;

    contextMessage += '--- E-Mail ' + (i + 1);
    if (isTarget) contextMessage += ' [ZU BEANTWORTEN]';
    contextMessage += ' ---\n';
    contextMessage += 'Von: ' + threadHistory[i].from + '\n';
    contextMessage += 'Datum: ' + threadHistory[i].date + '\n';
    contextMessage += 'Betreff: ' + threadHistory[i].subject + '\n\n';
    contextMessage += threadHistory[i].body + '\n\n';
  }

  if (targetIndex > 0) {
    contextMessage += '\n\nBitte erstelle eine professionelle Antwort auf E-Mail ' + targetIndex + ' (markiert mit [ZU BEANTWORTEN]).';
  } else {
    contextMessage += '\n\nBitte erstelle eine professionelle Antwort auf die letzte E-Mail im Thread.';
  }

  // Füge Nachricht zu Thread hinzu
  addMessageToThread(apiKey, threadId, contextMessage);

  // Starte Assistant Run mit optionalen Stichpunkten als additional_instructions
  var additionalInstructions = null;
  if (userNotes && userNotes.length > 0) {
    Logger.log('Sende Stichpunkte als additional_instructions an KI');

    additionalInstructions = 'WICHTIGE ANWEISUNGEN FÜR DEN INHALT DER ANTWORT:\n\n';
    additionalInstructions += 'Der Benutzer möchte, dass die folgende Information in die E-Mail-Antwort eingebaut wird:\n\n';
    additionalInstructions += userNotes + '\n\n';
    additionalInstructions += 'WICHTIG:\n';
    additionalInstructions += '- Dies sind KEINE zusätzlichen Fragen oder Nachrichten\n';
    additionalInstructions += '- Dies sind ANWEISUNGEN für den INHALT deiner Antwort\n';
    additionalInstructions += '- Baue diese Punkte natürlich in deine Antwort auf die ursprüngliche E-Mail ein\n';
    additionalInstructions += '- Behandle sie als würde der Verfasser der Antwort diese Punkte erwähnen/bestätigen wollen\n\n';
    additionalInstructions += 'Beispiel: "Termin am Freitag 14 Uhr zusagen" → "...gerne bestätige ich den Termin am Freitag um 14 Uhr..."';
  }

  var run = runAssistant(apiKey, threadId, assistantId, additionalInstructions);

  // Warte auf Completion (mit Timeout)
  var runResult = waitForCompletion(apiKey, threadId, run.id, 30);

  if (runResult.status !== 'completed') {
    throw new Error('Assistant konnte nicht abgeschlossen werden: ' + runResult.status);
  }

  // Hole die Antwort
  var messages = getThreadMessages(apiKey, threadId);

  if (messages.data && messages.data.length > 0) {
    var lastMessage = messages.data[0];
    if (lastMessage.content && lastMessage.content.length > 0) {
      return lastMessage.content[0].text.value;
    }
  }

  throw new Error('Keine Antwort in den Thread-Nachrichten gefunden');
}

/**
 * Generiert KI-Inhalt für NEUE E-Mails (ohne Thread-Historie)
 * @param {string} recipient - Empfänger-Adresse
 * @param {string} subject - Betreff der E-Mail
 * @param {string} userNotes - Stichpunkte/Inhalt vom Benutzer
 * @return {string} Generierter E-Mail-Text
 */
function generateNewEmailContent(recipient, subject, userNotes) {
  var apiKey = getUserProperty(PROPERTY_API_KEY);
  var assistantId = getUserProperty(PROPERTY_ASSISTANT_ID);

  if (!apiKey || !assistantId) {
    throw new Error('API Key oder Assistant ID nicht konfiguriert');
  }

  Logger.log('Generiere neue E-Mail ohne Thread-Historie');

  // Erstelle Thread bei OpenAI
  var threadResponse = createOpenAIThread(apiKey);
  var threadId = threadResponse.id;

  // Baue Kontext für NEUE E-Mail
  var contextMessage = 'Neue E-Mail schreiben:\n\n';
  contextMessage += 'Empfänger: ' + (recipient || 'Unbekannt') + '\n';
  if (subject && subject.trim().length > 0) {
    contextMessage += 'Betreff der E-Mail: ' + subject + '\n';
  }
  contextMessage += '\nBitte erstelle eine vollständige, professionelle E-Mail basierend auf den Inhaltspunkten des Benutzers.';

  // Füge Nachricht zu Thread hinzu
  addMessageToThread(apiKey, threadId, contextMessage);

  // Baue additional_instructions
  var additionalInstructions = 'WICHTIGE ANWEISUNGEN FÜR DIE E-MAIL:\n\n';

  var hasNotes = userNotes && userNotes.trim().length > 0;
  var hasSubject = subject && subject.trim().length > 0;

  if (hasSubject && hasNotes) {
    // Beides vorhanden: Betreff als Kontext, Stichpunkte als Hauptinhalt
    additionalInstructions += 'Der Benutzer möchte eine neue E-Mail schreiben:\n';
    additionalInstructions += '- Betreff: "' + subject + '"\n';
    additionalInstructions += '- Inhaltspunkte: ' + userNotes + '\n\n';
    additionalInstructions += 'Nutze den Betreff als thematischen Rahmen und baue die Inhaltspunkte natürlich ein.\n\n';
  } else if (hasSubject && !hasNotes) {
    // Nur Betreff: Generiere E-Mail basierend auf Betreff
    additionalInstructions += 'Der Benutzer möchte eine neue E-Mail schreiben zum Thema:\n';
    additionalInstructions += '"' + subject + '"\n\n';
    additionalInstructions += 'Erstelle eine passende E-Mail basierend auf diesem Betreff. ';
    additionalInstructions += 'Interpretiere den Betreff und erstelle einen sinnvollen, professionellen Inhalt.\n\n';
  } else if (!hasSubject && hasNotes) {
    // Nur Stichpunkte: Wie bisher
    additionalInstructions += 'Der Benutzer möchte eine neue E-Mail schreiben mit folgendem Inhalt:\n\n';
    additionalInstructions += userNotes + '\n\n';
  }

  additionalInstructions += 'WICHTIG:\n';
  additionalInstructions += '- Dies ist eine NEUE E-Mail, keine Antwort auf eine bestehende Nachricht\n';
  additionalInstructions += '- Erstelle eine VOLLSTÄNDIGE E-Mail mit:\n';
  additionalInstructions += '  * Angemessener Begrüßung (z.B. "Sehr geehrte/r ...", "Hallo ...")\n';
  additionalInstructions += '  * Hauptteil basierend auf Betreff/Inhaltspunkten\n';
  additionalInstructions += '  * Professioneller Grußformel (z.B. "Mit freundlichen Grüßen")\n';
  additionalInstructions += '- Verwende einen professionellen, angemessenen Ton\n';
  additionalInstructions += '- KEIN Betreff in der E-Mail selbst (nur im E-Mail-Feld)\n\n';
  additionalInstructions += 'Beispiele:\n';
  additionalInstructions += '1) Betreff: "Urlaubsantrag Juli" → Erstelle Urlaubsantrag für Juli\n';
  additionalInstructions += '2) Betreff: "Meeting-Anfrage" + Notizen: "Termin nächste Woche" → Kombiniere beides\n';
  additionalInstructions += '3) Nur Notizen: "Anfrage für Meeting" → Erstelle E-Mail aus Notizen';

  // Starte Assistant Run mit Stichpunkten als additional_instructions
  var run = runAssistant(apiKey, threadId, assistantId, additionalInstructions);

  // Warte auf Completion (mit Timeout)
  var runResult = waitForCompletion(apiKey, threadId, run.id, 30);

  if (runResult.status !== 'completed') {
    throw new Error('Assistant konnte nicht abgeschlossen werden: ' + runResult.status);
  }

  // Hole die Antwort
  var messages = getThreadMessages(apiKey, threadId);

  if (messages.data && messages.data.length > 0) {
    var lastMessage = messages.data[0];
    if (lastMessage.content && lastMessage.content.length > 0) {
      return lastMessage.content[0].text.value;
    }
  }

  throw new Error('Keine Antwort in den Thread-Nachrichten gefunden');
}

/**
 * OpenAI API Helper Functions
 */

function createOpenAIThread(apiKey) {
  var url = 'https://api.openai.com/v1/threads';
  var options = {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    },
    payload: JSON.stringify({})
  };

  var response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}

function addMessageToThread(apiKey, threadId, content) {
  var url = 'https://api.openai.com/v1/threads/' + threadId + '/messages';
  var options = {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    },
    payload: JSON.stringify({
      role: 'user',
      content: content
    })
  };

  var response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}

function runAssistant(apiKey, threadId, assistantId, additionalInstructions) {
  var url = 'https://api.openai.com/v1/threads/' + threadId + '/runs';

  var payload = {
    assistant_id: assistantId
  };

  // Füge additional_instructions hinzu, falls vorhanden
  if (additionalInstructions) {
    payload.additional_instructions = additionalInstructions;
  }

  // Performance-Optimierung: Model Override
  var modelType = getUserProperty(PROPERTY_MODEL_TYPE) || 'nano';
  if (modelType === 'nano') {
    // Ultra-schnelles Modell für maximale Performance
    payload.model = 'gpt-4.1-nano';
    Logger.log('Verwende ultra-schnelles Modell: gpt-4.1-nano');
  } else if (modelType === 'mini') {
    // Schnelles Modell mit guter Balance
    payload.model = 'gpt-4.1-mini';
    Logger.log('Verwende schnelles Modell: gpt-4.1-mini');
  } else {
    // Fallback: Verwende Standard aus Assistant
    Logger.log('Verwende Standard-Modell aus Assistant-Konfiguration');
  }

  var options = {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    },
    payload: JSON.stringify(payload)
  };

  var response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}

function waitForCompletion(apiKey, threadId, runId, maxWaitSeconds) {
  var url = 'https://api.openai.com/v1/threads/' + threadId + '/runs/' + runId;
  var options = {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'OpenAI-Beta': 'assistants=v2'
    }
  };

  var startTime = new Date().getTime();
  var maxWaitMs = maxWaitSeconds * 1000;

  // Adaptive Polling: Start schnell, dann langsamer
  // Spart API-Calls und reduziert Latenz bei schnellen Antworten
  var pollIntervals = [500, 500, 1000, 1000, 1500, 2000]; // in ms
  var pollCount = 0;

  while (true) {
    var response = UrlFetchApp.fetch(url, options);
    var run = JSON.parse(response.getContentText());

    if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
      var duration = ((new Date().getTime() - startTime) / 1000).toFixed(1);
      Logger.log('Assistant fertig nach ' + duration + 's (Status: ' + run.status + ')');
      return run;
    }

    if (new Date().getTime() - startTime > maxWaitMs) {
      throw new Error('Timeout: Assistant hat zu lange gebraucht');
    }

    // Adaptives Polling: Verwende schnellere Intervalle am Anfang
    var interval = pollCount < pollIntervals.length
      ? pollIntervals[pollCount]
      : 2000; // Default: 2 Sekunden

    Utilities.sleep(interval);
    pollCount++;
  }
}

function getThreadMessages(apiKey, threadId) {
  var url = 'https://api.openai.com/v1/threads/' + threadId + '/messages';
  var options = {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'OpenAI-Beta': 'assistants=v2'
    }
  };

  var response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}

/**
 * User Properties Helper
 */

function getUserProperty(key) {
  return PropertiesService.getUserProperties().getProperty(key);
}

function setUserProperty(key, value) {
  PropertiesService.getUserProperties().setProperty(key, value);
}

/**
 * Error Card Helper
 */
function createErrorCard(message) {
  var card = CardService.newCardBuilder();
  card.setHeader(CardService.newCardHeader()
    .setTitle('Fehler'));

  var section = CardService.newCardSection();
  section.addWidget(CardService.newTextParagraph()
    .setText('<font color="#EA4335">' + message + '</font>'));

  card.addSection(section);

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card.build()))
    .build();
}
