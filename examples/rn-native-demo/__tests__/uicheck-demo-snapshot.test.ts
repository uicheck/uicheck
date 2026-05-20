import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {createElementTree} from '@uicheck/core';
import {createRnDemoSnapshotElements} from '../uicheck-demo-model';

type TreeInput = Omit<
  ReturnType<typeof createRnDemoSnapshotElements>[number],
  'box' | 'className'
> & {
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    left: number;
  };
  classes: string[];
  visible: boolean;
};

test('writes the real RN example UICheck tree snapshot', () => {
  const elements = createRnDemoSnapshotElements().map(toTreeInput);
  const inspected = {
    platform: 'react-native',
    os: 'ios',
    viewport: {
      width: 390,
      height: 844,
      devicePixelRatio: 3,
      scrollX: 0,
      scrollY: 0,
    },
    count: elements.length,
    tree: createElementTree(elements),
  };
  const json = JSON.stringify(inspected, null, 2);

  expect(json).toContain('Runtime check 34');
  expect(json).toContain('Submit order');
  expect(inspected.tree).toHaveLength(1);
  expect(inspected).not.toHaveProperty('elements');

  writeArtifact('rn-demo-inspect-elements.snapshot.json', inspected);
});

function toTreeInput(element: ReturnType<typeof createRnDemoSnapshotElements>[number]): TreeInput {
  const [x, y, width, height] = element.box;
  const {box: _box, className, ...rest} = element;
  return {
    ...rest,
    classes: className?.split(/\s+/).filter(Boolean) ?? [],
    visible: width > 0 && height > 0,
    box: {
      x,
      y,
      width,
      height,
      top: y,
      left: x,
    },
  };
}

function writeArtifact(fileName: string, value: unknown) {
  const output = resolve(__dirname, '../build/uicheck-test-artifacts', fileName);
  mkdirSync(dirname(output), {recursive: true});
  writeFileSync(output, `${JSON.stringify(value, null, 2)}\n`);
}
