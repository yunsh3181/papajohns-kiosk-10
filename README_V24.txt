PAPA JOHNS 판교2테크노밸리점 키오스크 v24 좌석관리 데모

새 기능
- 초기화면: 로고 이미지 중심으로 변경
- 하단 '처음으로' 버튼 유지
- 먹고가기 선택 시 구역 → 좌석 선택
- Papa / Outside / Bottle / Room Zone
- 빈자리만 고객 선택 가능
- 주문 완료 시 좌석을 사용중으로 변경
- 조리완료 시 좌석을 정리중으로 변경
- 관리자 seats.html에서 빈자리/사용중/정리중/예약 변경
- 주문 관리자에서 좌석명 표시

GitHub 업로드
압축 해제 후 내부 파일 전체를 저장소 최상단에 덮어쓰기

주소
키오스크: /index.html
주문 관리자: /admin.html
좌석 관리자: /seats.html

중요
Firebase Firestore 규칙에 FIRESTORE_RULES_TEST.txt 내용을 반영해야 좌석 기능이 작동합니다.
테스트용 공개 규칙이므로 실제 영업 전에는 인증/보안 규칙이 필요합니다.
