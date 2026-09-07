Sub A실행()
    Call 다운로드실행
    
    Sheets("대학링크").Select
    Range("B4").Select
    
    Call 퀴리제거
    Call 값으로변환
    Call 다른이름으로저장
    
   
End Sub


Sub 퀴리제거()
    Dim ws As Worksheet
    Dim qt As QueryTable
    Dim conn As WorkbookConnection
    
    ' 모든 시트를 순회하며 쿼리 테이블 제거
    For Each ws In ThisWorkbook.Sheets
        For Each qt In ws.QueryTables
            qt.Delete
        Next qt
    Next ws
    
    ' 모든 외부 데이터 연결 제거
    For Each conn In ThisWorkbook.Connections
        conn.Delete
    Next conn
    

End Sub

Sub 값으로변환()
' 연결 퀴리 삭제와 값으로변환 매크로
    Dim ws As Worksheet                  ' 시트
    Dim q As QueryTable                  ' 쿼리테이블
    For Each ws In Sheets                      ' 시트를 돌면서
        For Each q In ws.QueryTables        ' 쿼리테이블을 돌면서
          ' q.ResultRange.Delete xlUp      ' 영역 삭제
            q.Delete                        ' 쿼리삭제
        Next
    Next
    
    With Application: .Calculation = 3:
    On Error Resume Next: Dim w As Worksheet, v
        For Each w In Sheets
        v = w.UsedRange.Value: w.UsedRange = v
        Next: Set w = Nothing: .Calculation = 1:
    End With
    
End Sub

Sub 다른이름으로저장()
    Dim strPath As String

    ' 현재 활성화된 파일의 경로를 가져옵니다.
    strPath = ActiveWorkbook.Path & "\"

    With Application
        .DisplayAlerts = False
        
        ' 파일을 매크로 없이 저장합니다.
        ActiveWorkbook.SaveAs Filename:=strPath & Format(Date, "yyyymmdd") & Format(Time, "hhmm") & "기준" & ".xlsx", FileFormat:=xlOpenXMLWorkbook
        
        .DisplayAlerts = True
    End With
    
End Sub

-------------------------------------------------------------------------------
VBA MACRO Module2.bas 
in file: xl/vbaProject.bin - OLE stream: 'VBA/Module2'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Sub 다운로드실행()
    Dim linkSheet As Worksheet
    Dim row As Long
    Dim link As String
    Dim destSheet As Worksheet
    Dim qt As QueryTable
    Dim sheetName As String
    Dim i As Integer
    Dim http As Object
    Dim status As Long

    ' "대학링크" 시트로 이동 (활성화된 워크북에서)
    Set linkSheet = ActiveWorkbook.Sheets("대학링크")
    
    ' 시작 행 설정 (헤더를 가정하여 4행부터 시작)
    row = 4
    
    ' HTTP 요청을 위한 객체 생성
    Set http = CreateObject("MSXML2.XMLHTTP.6.0")
    
    Do While linkSheet.Cells(row, 8).Value <> "" ' G열의 공백까지 반복
        ' G열의 링크 주소 가져오기
        link = linkSheet.Cells(row, 8).Value
        
        ' 웹페이지 요청
        On Error Resume Next ' 오류 발생 시 실행을 계속함
        http.Open "GET", link, False
        http.Send
        status = http.status ' HTTP 상태 코드 저장
        On Error GoTo 0 ' 오류 처리를 초기화
        
        ' 상태 코드가 200(성공)인지 확인
        If status = 200 Then
            On Error GoTo SkipLink ' 웹 쿼리 오류 발생 시 이쪽으로 이동
            
            ' 새로운 시트 생성 (활성화된 워크북에서)
            Set destSheet = ActiveWorkbook.Sheets.Add(After:=ActiveWorkbook.Sheets(ActiveWorkbook.Sheets.Count))
            
            ' 시트 이름 설정: 유효한 시트 이름으로 변환
            sheetName = linkSheet.Cells(row, 7).Value
            sheetName = Replace(sheetName, "/", "_")
            sheetName = Replace(sheetName, "\", "_")
            sheetName = Replace(sheetName, ":", "_")
            sheetName = Replace(sheetName, "*", "_")
            sheetName = Replace(sheetName, "?", "_")
            sheetName = Replace(sheetName, "[", "_")
            sheetName = Replace(sheetName, "]", "_")
            sheetName = Replace(sheetName, "=", "_")
            sheetName = Replace(sheetName, "'", "_")
            sheetName = Replace(sheetName, Chr(34), "_")
            
            ' 중복된 시트 이름 확인 및 처리
            i = 1
            Do While DoesSheetExist(sheetName)
                sheetName = linkSheet.Cells(row, 7).Value & "_" & i
                i = i + 1
            Loop
            destSheet.Name = sheetName
            
            ' 웹 쿼리 생성 및 K열부터 데이터 삽입
            Set qt = destSheet.QueryTables.Add(Connection:="URL;" & link, Destination:=destSheet.Cells(1, 4)) ' D열은 4번째 열
            
            ' 웹 쿼리 옵션 설정
            With qt
                .BackgroundQuery = False
                .TablesOnlyFromHTML = True ' 테이블만 가져오기
                .WebFormatting = xlWebFormattingNone ' 서식 없음 선택
                .WebSelectionType = xlEntirePage ' 페이지 전체에서 모든 테이블 가져오기
                .Refresh BackgroundQuery:=False
            End With
            
            ' 쿼리의 연결을 끊고 값을 그대로 남기기
            qt.Delete
            
            ' 오류 없이 정상 처리된 경우 상태 셀 비우기
            linkSheet.Cells(row, 9).Value = "" ' 오류 메시지 비우기

        Else
            linkSheet.Cells(row, 9).Value = "오류 (상태 코드: " & status & ")"
        End If

SkipLink:
        ' 다음 링크로 이동
        row = row + 1
    Loop
    
    Set http = Nothing
End Sub

Function DoesSheetExist(sheetName As String) As Boolean
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ActiveWorkbook.Sheets(sheetName)
    DoesSheetExist = Not ws Is Nothing
    On Error GoTo 0
End Function
