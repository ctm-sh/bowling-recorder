// 도메인 계산에서 쓰는 공용 타입. DB 행과 분리해서 순수 함수만으로 테스트할 수 있게 한다.

/** 티어(0~14) → 개인 핸디 */
export type HandicapTable = Record<string, number>;

/** 팀 배분 대상 */
export type Player = {
  id: string;
  tier: number;
  /** 전체 에버. 기록이 없으면 null */
  avg: number | null;
};

/** 배분 결과: 한 사람의 팀과 묶음(= 상대방 그룹) */
export type Slot = { memberId: string; teamNo: number; groupNo: number };

/** 점수가 입력된 게임의 팀 */
export type TeamEntry = {
  teamNo: number;
  /** 팀이 받는 순 핸디: 팀원 핸디 + 꼭두각시 점수를 팀끼리 비교한 차이 (합의 조정 포함) */
  handicap: number;
  members: MemberEntry[];
};

export type MemberEntry = {
  memberId: string;
  score: number;
  /** 이 게임에서 상대방과의 티어 차이로 받은 개인 핸디 */
  handicap: number;
  groupNo: number;
};

export type RankedTeam = TeamEntry & {
  /** 핸디를 뺀 점수: 팀원 점수 합 */
  raw: number;
  /** raw + handicap */
  total: number;
  /** 1부터 시작 */
  rank: number;
};
