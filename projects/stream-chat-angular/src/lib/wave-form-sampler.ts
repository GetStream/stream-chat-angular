export const resampleWaveForm = (
  waveFormData: number[],
  sampleSize: number,
) => {
  return waveFormData.length > sampleSize
    ? downsample(waveFormData, sampleSize)
    : upsample(waveFormData, sampleSize);
};

const downsample = (waveFormData: number[], sampleSize: number) => {
  if (waveFormData.length <= sampleSize) {
    return waveFormData;
  }

  if (sampleSize === 1) return [mean(waveFormData)];

  const result: number[] = [];
  // bucket size adjusted due to the fact that the first and the last item in the original data array is kept in target output
  const bucketSize = (waveFormData.length - 2) / (sampleSize - 2);
  let lastSelectedPointIndex = 0;
  result.push(waveFormData[lastSelectedPointIndex]); // Always add the first point
  let maxAreaPoint, maxArea, triangleArea;

  for (let bucketIndex = 1; bucketIndex < sampleSize - 1; bucketIndex++) {
    const previousBucketRefPoint = waveFormData[lastSelectedPointIndex];
    const nextBucketMean = getNextBucketMean(
      waveFormData,
      bucketIndex,
      bucketSize,
    );

    const currentBucketStartIndex =
      Math.floor((bucketIndex - 1) * bucketSize) + 1;
    const nextBucketStartIndex = Math.floor(bucketIndex * bucketSize) + 1;
    const countUnitsBetweenAtoC =
      1 + nextBucketStartIndex - currentBucketStartIndex;

    maxArea = triangleArea = -1;

    for (
      let currentPointIndex = currentBucketStartIndex;
      currentPointIndex < nextBucketStartIndex;
      currentPointIndex++
    ) {
      const countUnitsBetweenAtoB =
        Math.abs(currentPointIndex - currentBucketStartIndex) + 1;
      const countUnitsBetweenBtoC =
        countUnitsBetweenAtoC - countUnitsBetweenAtoB;
      const currentPointValue = waveFormData[currentPointIndex];

      triangleArea = triangleAreaHeron(
        triangleBase(
          Math.abs(previousBucketRefPoint - currentPointValue),
          countUnitsBetweenAtoB,
        ),
        triangleBase(
          Math.abs(currentPointValue - nextBucketMean),
          countUnitsBetweenBtoC,
        ),
        triangleBase(
          Math.abs(previousBucketRefPoint - nextBucketMean),
          countUnitsBetweenAtoC,
        ),
      );

      if (triangleArea > maxArea) {
        maxArea = triangleArea;
        maxAreaPoint = waveFormData[currentPointIndex];
        lastSelectedPointIndex = currentPointIndex;
      }
    }

    if (typeof maxAreaPoint !== 'undefined') result.push(maxAreaPoint);
  }

  result.push(waveFormData[waveFormData.length - 1]); // Always add the last point

  return result;
};

const upsample = (waveFormData: number[], sampleSize: number) => {
  if (sampleSize === waveFormData.length) return waveFormData;

  // eslint-disable-next-line  prefer-const
  let [bucketSize, remainder] = divMod(sampleSize, waveFormData.length);
  const result: number[] = [];

  for (let i = 0; i < waveFormData.length; i++) {
    const extra = remainder && remainder-- ? 1 : 0;
    result.push(...Array<number>(bucketSize + extra).fill(waveFormData[i]));
  }
  return result;
};

const getNextBucketMean = (
  data: number[],
  currentBucketIndex: number,
  bucketSize: number,
) => {
  const nextBucketStartIndex = Math.floor(currentBucketIndex * bucketSize) + 1;
  let nextNextBucketStartIndex =
    Math.floor((currentBucketIndex + 1) * bucketSize) + 1;
  nextNextBucketStartIndex =
    nextNextBucketStartIndex < data.length
      ? nextNextBucketStartIndex
      : data.length;

  return mean(data.slice(nextBucketStartIndex, nextNextBucketStartIndex));
};

const mean = (values: number[]) =>
  values.reduce((acc, value) => acc + value, 0) / values.length;

const triangleAreaHeron = (a: number, b: number, c: number) => {
  const s = (a + b + c) / 2;
  return Math.sqrt(s * (s - a) * (s - b) * (s - c));
};

const triangleBase = (a: number, b: number) =>
  Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));

const divMod = (num: number, divisor: number) => {
  return [Math.floor(num / divisor), num % divisor];
};
