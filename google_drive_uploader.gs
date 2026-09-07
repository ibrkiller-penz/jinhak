/**
 * ====================================================================
 * 2027 수시 교대 경쟁률 - 구글 드라이브 대학별 스냅샷/보고서 업로더 (GAS Webhook)
 * 대상 드라이브 루트 폴더 ID: 1WmHB5_EqiZklq6kRnMXDn_kfbNXAD61j
 * ====================================================================
 */

const ROOT_FOLDER_ID = "1WmHB5_EqiZklq6kRnMXDn_kfbNXAD61j";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || "upload";

    if (action === "upload") {
      const fileName = data.fileName || "경쟁률스냅샷_" + new Date().getTime();
      const mimeType = data.mimeType || "application/octet-stream";
      const base64Data = data.base64Data;
      const subFolderName = data.subFolder || "기타";
      const rootId = data.rootFolderId || ROOT_FOLDER_ID;

      const decoded = Utilities.base64Decode(base64Data);
      const blob = Utilities.newBlob(decoded, mimeType, fileName);

      // 루트 폴더 가져오기
      const rootFolder = DriveApp.getFolderById(rootId);

      // 대학별 서브폴더 찾기 또는 생성
      let targetFolder;
      const subFolders = rootFolder.getFoldersByName(subFolderName);
      if (subFolders.hasNext()) {
        targetFolder = subFolders.next();
      } else {
        targetFolder = rootFolder.createFolder(subFolderName);
      }

      // 파일 생성 및 링크 권한 부여
      const file = targetFolder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        fileId: file.getId(),
        fileName: fileName,
        fileUrl: file.getUrl(),
        downloadUrl: file.getDownloadUrl(),
        folderUrl: targetFolder.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "지원하지 않는 action입니다."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("✅ 2027 수시 교대 경쟁률 구글 드라이브 업로더가 정상 작동 중입니다. (루트: 1WmHB5_EqiZklq6kRnMXDn_kfbNXAD61j)");
}

/**
 * Apps Script 편집기 상단에서 이 함수(testAuthorize)를 선택 후 [▷ 실행]을 누르면
 * 최초 1회 Google 계정 권한(DriveApp) 승인 팝업이 표시됩니다.
 */
function testAuthorize() {
  const folder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  Logger.log("✅ 루트 폴더 연동 성공: " + folder.getName() + " (" + folder.getId() + ")");
}
