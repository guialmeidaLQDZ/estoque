function exportarEstruturAppSheet() {
  const APP_ID  = "022805f5-2701-4d30-b703-8ae69ae97b28";   // Manage → Info
  const API_KEY = PropertiesService.getScriptProperties().getProperty("APPSHEET_API_KEY"); // fix: chave segura

  const url = "https://api.appsheet.com/api/v2/apps/" + APP_ID + "/tables";

  const response = UrlFetchApp.fetch(url, {
    method: "get",
    headers: {
      "ApplicationAccessKey": API_KEY
    },
    muteHttpExceptions: true
  });

  const json = response.getContentText();
  
  // Salva o resultado numa aba chamada LOG_API
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName("LOG_API") || ss.insertSheet("LOG_API");
  sh.clearContents();
  sh.getRange(1, 1).setValue(json);
  
  console.log("Status: " + response.getResponseCode());
  console.log(json);
}
