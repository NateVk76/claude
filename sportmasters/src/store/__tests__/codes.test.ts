import { describe, expect, it } from 'vitest';
import { useGame } from '../game';
import { checkCode, createCode } from '../../engine/codes';

describe('codes cadeaux dans la partie', () => {
  it('crédite un code une seule fois par partie', () => {
    const code = createCode('TEST', 25_000);
    const before = useGame.getState().balles;
    expect(useGame.getState().redeemCode(code.toLowerCase())).toEqual({ kind: 'balles', balles: 25_000 });
    expect(useGame.getState().balles).toBe(before + 25_000);
    expect(useGame.getState().redeemCode(code)).toEqual({ kind: 'deja-utilise' });
    expect(useGame.getState().redeemCode('TEST-25000-AAAAAA')).toEqual({ kind: 'invalide' });
    expect(useGame.getState().balles).toBe(before + 25_000);
  });

  it('ne crée de codes qu’avec le créateur débloqué, et le garde pour une nouvelle partie', () => {
    useGame.setState({ codeMaker: false });
    expect(useGame.getState().makeCode(1_000)).toBeNull();
    useGame.setState({ codeMaker: true });
    const code = useGame.getState().makeCode(1_000)!;
    expect(checkCode(code)?.balles).toBe(1_000);
    expect(useGame.getState().makeCode(1_000, 'Nate')).toBe(createCode('NATE', 1_000));
    expect(useGame.getState().madeCodes.map((c) => c.code)).toEqual([createCode('NATE', 1_000), code]);
    useGame.getState().resetGame();
    expect(useGame.getState().codeMaker).toBe(true);
    expect(useGame.getState().madeCodes).toHaveLength(2);
    expect(useGame.getState().redeemedCodes).toEqual([]);
  });
});
