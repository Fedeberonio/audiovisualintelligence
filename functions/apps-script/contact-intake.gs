/**
 * AVI — receptor institucional de consultas web.
 * Versión desplegada como Web App bajo academy@audiovisualintelligence.ai.
 */

const AVI_CONTACT_RECIPIENT = 'academy@audiovisualintelligence.ai';
const AVI_SHEET_PROPERTY = 'AVI_CONTACT_SHEET_ID';

function doPost(event) {
  try {
    const value = JSON.parse((event && event.postData && event.postData.contents) || '{}');
    const inquiry = {
      name: String(value.name || '').trim(),
      email: String(value.email || '').trim(),
      topic: String(value.topic || '').trim(),
      message: String(value.message || '').trim()
    };
    if (inquiry.name.length < 2 || inquiry.email.indexOf('@') < 1 || !inquiry.topic || inquiry.message.length < 4) {
      throw new Error('Consulta incompleta');
    }

    const properties = PropertiesService.getScriptProperties();
    const savedSheetId = properties.getProperty(AVI_SHEET_PROPERTY);
    let sheet;
    if (savedSheetId) {
      sheet = SpreadsheetApp.openById(savedSheetId).getActiveSheet();
    } else {
      const spreadsheet = SpreadsheetApp.create('AVI Consultas web');
      sheet = spreadsheet.getActiveSheet();
      sheet.setName('Consultas');
      sheet.appendRow(['Recibida', 'Nombre', 'Email', 'Motivo', 'Mensaje', 'Estado']);
      properties.setProperty(AVI_SHEET_PROPERTY, spreadsheet.getId());
    }

    sheet.appendRow([new Date(), inquiry.name, inquiry.email, inquiry.topic, inquiry.message, 'Nueva']);
    MailApp.sendEmail({
      to: AVI_CONTACT_RECIPIENT,
      subject: '[AVI] Nueva consulta - ' + inquiry.topic,
      body: 'Nombre: ' + inquiry.name + ' | Email: ' + inquiry.email + ' | Motivo: ' + inquiry.topic + ' | Mensaje: ' + inquiry.message
    });
    return ContentService.createTextOutput('ok');
  } catch (error) {
    console.error(error);
    return ContentService.createTextOutput('error');
  }
}
