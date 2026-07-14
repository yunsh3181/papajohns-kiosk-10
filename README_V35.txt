PAPA JOHNS v35 그룹 좌석 엔진

핵심 수정
- Firestore transaction은 모든 read 후 모든 write 순서로 변경
- Room / Outside 다중 테이블 자동 배정 시 transaction 오류 수정
- 각 팀에 groupId 부여
- 그룹 단위로 입실/정리/퇴실 가능
- 룸 최초 6~12명, 이후 남은 테이블×4명
- 야외 총 4테이블, 사용중 테이블 1개당 추가 가능 4명 감소
- 보틀 4인석 최대 5명
- 관리자 좌석관리에서 그룹 이용 현황 표시
