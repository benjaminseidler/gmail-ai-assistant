/**
 * Gmail AI Assistant Add-on
 * Generiert KI-basierte E-Mail-Antworten mit OpenAI Assistant API
 */

// Properties Keys
var PROPERTY_API_KEY = 'OPENAI_API_KEY';
var PROPERTY_ASSISTANT_ID = 'OPENAI_ASSISTANT_ID';

/**
 * Erstellt die Haupt-Card beim Öffnen einer E-Mail
 */
function buildMessageCard(e) {
  var apiKey = getUserProperty(PROPERTY_API_KEY);
  var assistantId = getUserProperty(PROPERTY_ASSISTANT_ID);

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
    statusSection.addWidget(CardService.newTextParagraph()
      .setText('<font color="#34A853">✓ Konfiguriert</font><br>' +
               'Assistant ID: ' + assistantId.substring(0, 20) + '...'));

    statusSection.addWidget(CardService.newTextParagraph()
      .setText('<br><b>So verwendest du das Add-on:</b><br>' +
               '1. Öffne oder erstelle eine Antwort-Mail<br>' +
               '2. Klicke auf "KI-Text einfügen" im Compose-Fenster<br>' +
               '3. Der KI-generierte Text wird eingefügt'));

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

  section.addWidget(CardService.newTextParagraph()
    .setText('<font color="#5F6368"><i>Deine Zugangsdaten werden sicher in deinem Google Account gespeichert.</i></font>'));

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

  // Nur aktualisieren wenn nicht maskiert
  if (apiKey && !apiKey.startsWith('••••')) {
    setUserProperty(PROPERTY_API_KEY, apiKey);
  }

  if (assistantId) {
    setUserProperty(PROPERTY_ASSISTANT_ID, assistantId);
  }

  var notification = CardService.newNotification()
    .setText('✓ Einstellungen gespeichert');

  return CardService.newActionResponseBuilder()
    .setNotification(notification)
    .setNavigation(CardService.newNavigation().popCard())
    .build();
}

/**
 * Fügt KI-generierten Text in offenes Compose-Fenster ein
 */
function insertAITextToCompose(e) {
  try {
    var threadId = null;
    var subject = null;
    var toRecipient = null;

    // Extrahiere verfügbare Informationen
    if (e.gmail && e.gmail.subject) {
      subject = e.gmail.subject;
    } else if (e.draftMetadata && e.draftMetadata.subject) {
      subject = e.draftMetadata.subject;
    }

    if (e.gmail && e.gmail.toRecipients && e.gmail.toRecipients.length > 0) {
      toRecipient = e.gmail.toRecipients[0];
    } else if (e.draftMetadata && e.draftMetadata.toRecipients && e.draftMetadata.toRecipients.length > 0) {
      toRecipient = e.draftMetadata.toRecipients[0];
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
        Logger.log('DUPLICATE: Anfrage vor ' + timeSince + 'ms bereits gestartet - IGNORIERE');
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

      // Versuche Thread über Subject und Empfänger zu finden
      if (subject && toRecipient) {
        // Entferne "Re: " vom Subject für die Suche
        var cleanSubject = subject.replace(/^Re:\s*/i, '').trim();

        // Suche nach Thread mit diesem Subject und Empfänger
        var searchQuery = 'subject:"' + cleanSubject + '" (to:' + toRecipient + ' OR from:' + toRecipient + ')';
        Logger.log('Suche mit Query: ' + searchQuery);

        var threads = GmailApp.search(searchQuery, 0, 5);

        if (threads.length > 0) {
          // Nimm den neuesten Thread
          threadId = threads[0].getId();
          Logger.log('Thread gefunden: ' + threadId);
        } else {
          throw new Error('Kein passender E-Mail-Thread gefunden für: ' + cleanSubject);
        }
      } else {
        throw new Error('Subject oder Empfänger nicht verfügbar. Subject: ' + subject + ', To: ' + toRecipient);
      }

      if (threadId) {
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

        // Zeige Progress-Nachricht
        Logger.log('Generiere KI-Antwort...');

        // Generiere KI-Antwort mit der letzten Nachricht
        var aiResponse = getAIResponseForMessage(threadHistory, lastMessage.getId());

        if (!aiResponse) {
          throw new Error('Keine Antwort von der KI erhalten');
        }

        // Konvertiere Zeilenumbrüche für HTML
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
      }

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
 */
function extractThreadHistory(messages) {
  var history = [];

  for (var i = 0; i < messages.length; i++) {
    var msg = messages[i];
    history.push({
      id: msg.getId(),
      from: msg.getFrom(),
      date: msg.getDate().toISOString(),
      subject: msg.getSubject(),
      body: msg.getPlainBody().substring(0, 2000) // Limitiere Länge
    });
  }

  return history;
}

/**
 * Ruft OpenAI Assistant API auf - für spezifische Nachricht
 */
function getAIResponseForMessage(threadHistory, targetMessageId) {
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

  // Starte Assistant Run
  var run = runAssistant(apiKey, threadId, assistantId);

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

function runAssistant(apiKey, threadId, assistantId) {
  var url = 'https://api.openai.com/v1/threads/' + threadId + '/runs';
  var options = {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    },
    payload: JSON.stringify({
      assistant_id: assistantId
    })
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

  while (true) {
    var response = UrlFetchApp.fetch(url, options);
    var run = JSON.parse(response.getContentText());

    if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
      return run;
    }

    if (new Date().getTime() - startTime > maxWaitMs) {
      throw new Error('Timeout: Assistant hat zu lange gebraucht');
    }

    Utilities.sleep(1000); // Warte 1 Sekunde
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
