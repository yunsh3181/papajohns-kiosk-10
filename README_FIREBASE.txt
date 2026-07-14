PAPA JOHNS 판교2테크노밸리점 v22 — Firebase 실시간 주문 데모

1. GitHub Pages 업로드
- 이 압축파일 내부 파일 전체를 papajohns-kiosk2 저장소의 루트에 덮어씁니다.
- 키오스크: https://yunsh3181.github.io/papajohns-kiosk2/?v=22
- 관리자: https://yunsh3181.github.io/papajohns-kiosk2/admin.html?v=22

2. Firestore 규칙
- Firebase Console > Firestore Database > 규칙
- FIRESTORE_RULES_TEST.txt 안의 규칙을 붙여넣고 게시
- 테스트 모드가 아직 유효하면 바로 동작할 수 있지만, 규칙을 명시적으로 확인하는 것을 권장합니다.

3. 테스트
- 관리자 페이지를 먼저 열고 '알림음 켜기'를 한 번 누릅니다.
- 다른 휴대폰/브라우저에서 키오스크 주문을 완료합니다.
- 관리자 페이지에 주문 카드가 실시간 표시되고 알림음이 납니다.
- 접수 > 조리 시작 > 조리 완료 상태 변경을 테스트합니다.

주의
- 현재 주문 완료 버튼은 실제 카드 결제 없이 Firestore에 주문을 저장합니다.
- 테스트용 공개 규칙이므로 실제 운영 전 Firebase Authentication을 연결해야 합니다.
