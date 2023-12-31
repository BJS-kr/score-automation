import axios from 'axios';

const ID_NOT_EXISTS = Symbol('ID_NX');
const LENGTH_0 = Symbol('LENGTH_0');

export class ApiService {
  private readonly userObjectKeys = ['userId', 'name', 'email', 'pw'] as const;
  async getPointToReduceAndTargetUserIdIfExistsOfGetAllUsersApi(
    url: string,
    tried = 0,
  ): Promise<{
    targetUserId: string | symbol;
    allUsersPointToReduce: number;
    allUsersReductionReasons: string[];
  }> {
    const path = new URL('/user', url).toString();
    const { data: responseBody, status } = await axios.get(path).catch((e) => ({
      data: e.response?.data ?? null,
      status: e.response?.status ?? null,
    }));

    if (status >= 400 && tried < 3)
      return this.getPointToReduceAndTargetUserIdIfExistsOfGetAllUsersApi(
        url,
        tried + 1,
      );
    const responseBodyExists = !!responseBody;
    const isStatus200 = status === 200;
    const isBodyLengthInAllowedRange =
      responseBody?.length >= 3 && responseBody?.length <= 99;
    const reductionReasons = [];

    !responseBodyExists &&
      reductionReasons.push('응답 본문이 존재하지 않습니다 (3점 감점)');

    responseBodyExists &&
      !isStatus200 &&
      reductionReasons.push(
        '모든 회원 조회의 응답 코드가 200이 아닙니다 (1점 감점)',
      );

    responseBodyExists &&
      !isBodyLengthInAllowedRange &&
      reductionReasons.push(
        '모든 회원 조회의 응답 본문 길이가 3보다 작거나 99보다 큽니다 (1점 감점)',
      );

    const bodyLength = responseBody?.length ?? 0;
    const indexBetween0And2 = Math.floor(Math.random() * 3);
    return {
      targetUserId: bodyLength
        ? responseBody[indexBetween0And2]?.userId ?? ID_NOT_EXISTS
        : LENGTH_0,
      allUsersPointToReduce: responseBodyExists
        ? (!isStatus200 ? 1 : 0) + (!isBodyLengthInAllowedRange ? 1 : 0)
        : 3,
      allUsersReductionReasons: reductionReasons,
    };
  }

  async getPointToReduceOfTargetUserApi(
    url: string,
    userId: string | symbol,
    tried = 0,
  ): Promise<{
    targetUserPointToReduce: number;
    targetUserReductionReasons: string[];
  }> {
    if (typeof userId === 'symbol')
      return {
        targetUserPointToReduce: 5,
        targetUserReductionReasons: [
          `${
            userId === LENGTH_0
              ? '응답 본문의 배열이 존재하지 않았거나 배열의 길이가 0입니다'
              : '응답 본문에 배열과 요소가 존재하나 특정 유저 조회를 위해 선택된 유저에게 id가 존재하지 않습니다'
          }. 그러므로 유저조회를 할 수 없습니다. (5점 감점)`,
        ],
      };

    const path = new URL(`/user/${userId}`, url).toString();
    const { data: responseBody, status } = await axios.get(path).catch((e) => ({
      data: e.response?.data ?? null,
      status: e.response?.status ?? null,
    }));

    if (status >= 400 && tried < 3)
      return this.getPointToReduceOfTargetUserApi(url, userId, tried + 1);

    const pointToReduce = this.userObjectKeys.reduce((reduction, key) => {
      return responseBody && responseBody[key] ? reduction : ++reduction;
    }, 0);
    const isStatus200 = status === 200;
    const reductionReasons = [];
    !isStatus200 &&
      reductionReasons.push(
        '특정 회원 조회의 응답 코드가 200이 아닙니다 (1점 감점)',
      );
    pointToReduce &&
      reductionReasons.push(
        `특정 회원 조회의 응답 본문에 ${pointToReduce}개의 필수 정보가 누락되었습니다 (${pointToReduce}점 감점)`,
      );
    // 총 5점 감점 가능
    return {
      targetUserPointToReduce: (!isStatus200 ? 1 : 0) + pointToReduce,
      targetUserReductionReasons: reductionReasons,
    };
  }
}
