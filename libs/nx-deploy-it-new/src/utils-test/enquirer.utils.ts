import { MockSTDIN } from 'mock-stdin';

export const KEYS = {
  UP: '\x1B\x5B\x41',
  DOWN: '\x1B\x5B\x42',
  ENTER: '\x0D',
  SPACE: '\x20'
};

export const delay = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

export function answerInitQuestionsAWS(
  io: MockSTDIN,
  region: string,
  awsProfile?: string
) {
  const initQuestions = async () => {
    if (region) {
      io.send(region);
    }
    io.send(KEYS.ENTER);
    await delay(10);

    if (awsProfile) {
      io.send('my-aws-profile');
    }
    io.send(KEYS.ENTER);
  };
  setTimeout(() => initQuestions().then(), 5);
}

export function answerInitQuestionsAzure(io: MockSTDIN, location: string) {
  const initQuestions = async () => {
    if (location) {
      io.send(location);
    }
    io.send(KEYS.ENTER);
  };
  setTimeout(() => initQuestions().then(), 5);
}

export function answerInitQuestionsGCP(
  io: MockSTDIN,
  projectId: string,
  region?: string
) {
  const initQuestions = async () => {
    io.send(projectId);
    io.send(KEYS.ENTER);

    await delay(10);
    if (region) {
      io.send(region);
      io.send(KEYS.ENTER);
    }
  };
  setTimeout(() => initQuestions().then(), 5);
}

export function answerScanQuestionsWithNoApp(io: MockSTDIN) {
  const initQuestions = async () => {
    io.send(KEYS.ENTER);
  };
  setTimeout(() => initQuestions().then(), 5);
}

export function answerScanQuestions(io: MockSTDIN, azureLocation: string) {
  const initQuestions = async () => {
    io.send(KEYS.SPACE);
    io.send(KEYS.ENTER);

    await delay(10);

    io.send(KEYS.DOWN);
    io.send(KEYS.ENTER);

    await delay(10);

    if (azureLocation) {
      io.send(azureLocation);
      io.send(KEYS.ENTER);
    }
  };
  setTimeout(() => initQuestions().then(), 5);
}
