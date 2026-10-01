import { useState, type FormEvent } from 'react';
import { useGame, formatBalles } from '../store/game';
import { MAX_CODE_BALLES, MAX_WORD_LENGTH } from '../engine/codes';
import { sfx } from '../audio/sfx';
import { Balles } from './Balles';

// Case « Code cadeau » de la boutique. Le mot de passe administrateur, tapé dans la même case,
// débloque sur l'appareil le créateur de codes : un code du montant voulu, à partager ou à garder.

type Message = { kind: 'ok' | 'error'; text: string };

const PRESETS = [10_000, 100_000, 1_000_000];

export function CodesPanel() {
  const redeemCode = useGame((s) => s.redeemCode);
  const codeMaker = useGame((s) => s.codeMaker);
  const [input, setInput] = useState('');
  const [message, setMessage] = useState<Message | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    const result = redeemCode(input);
    if (result.kind === 'balles' || result.kind === 'createur') {
      sfx.coin();
      setInput('');
      setMessage({
        kind: 'ok',
        text: result.kind === 'balles' ? `+${formatBalles(result.balles)} ajoutées à ta partie !` : 'Créateur de codes débloqué sur cet appareil.',
      });
    } else {
      sfx.error();
      setMessage({
        kind: 'error',
        text: result.kind === 'deja-utilise' ? 'Tu as déjà utilisé ce code dans cette partie.' : 'Code inconnu. Il s’écrit MOT-MONTANT-CLÉ, avec les tirets.',
      });
    }
  };

  return (
    <section className="panel codes" aria-labelledby="codes-title">
      <div className="codes__intro">
        <h2 id="codes-title">Code cadeau</h2>
        <p className="muted small">Tu as un code ? Entre-le pour gagner des balles. Chaque code ne sert qu’une fois par partie.</p>
      </div>
      <form className="codes__form" onSubmit={submit}>
        <label className="field field--grow">
          <span className="visually-hidden">Code cadeau</span>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ex. CADEAU-50000-K7QX4M"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
        </label>
        <button type="submit" className="btn btn--primary" disabled={!input.trim()}>
          Valider
        </button>
      </form>
      {message && (
        <p className={`codes__message is-${message.kind}`} role="status">
          {message.text}
        </p>
      )}
      {codeMaker && <CodeMaker onMessage={setMessage} />}
    </section>
  );
}

function CodeMaker({ onMessage }: { onMessage: (message: Message | null) => void }) {
  const makeCode = useGame((s) => s.makeCode);
  const redeemCode = useGame((s) => s.redeemCode);
  const madeCodes = useGame((s) => s.madeCodes);
  const redeemed = useGame((s) => s.redeemedCodes);
  const close = useGame((s) => s.closeCodeMaker);
  const [amount, setAmount] = useState(50_000);
  const [word, setWord] = useState('');
  const [last, setLast] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const valid = Number.isInteger(amount) && amount >= 1 && amount <= MAX_CODE_BALLES;

  const create = () => {
    const code = makeCode(amount, word);
    if (!code) return;
    sfx.click();
    setLast(code);
    setCopied(null);
    onMessage(null);
  };

  // pour soi : un code au mot tiré au hasard, utilisé tout de suite
  const credit = () => {
    const code = makeCode(amount);
    if (code && redeemCode(code).kind === 'balles') {
      sfx.coin();
      onMessage({ kind: 'ok', text: `+${formatBalles(amount)} ajoutées à ta partie !` });
    }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
    } catch {
      // presse-papiers bloqué : le code reste sélectionnable à la main
      setCopied(null);
    }
  };

  return (
    <div className="code-maker">
      <div className="code-maker__head">
        <h3>Créateur de codes</h3>
        <button type="button" className="btn btn--ghost btn--xs" onClick={close}>
          Fermer
        </button>
      </div>
      <p className="muted small">
        Choisis un montant (et un mot si tu veux, sinon il est tiré au hasard). Le code marche partout où le jeu est en ligne, une fois par partie.
      </p>
      <div className="code-maker__fields">
        <label className="field">
          <span>Balles</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_CODE_BALLES}
            step={1000}
            value={Number.isFinite(amount) ? amount : ''}
            onChange={(event) => setAmount(Math.round(Number(event.target.value)))}
          />
        </label>
        <label className="field">
          <span>Mot (facultatif)</span>
          <input
            value={word}
            maxLength={MAX_WORD_LENGTH}
            placeholder="Au hasard"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            onChange={(event) => setWord(event.target.value)}
          />
        </label>
      </div>
      <div className="presets">
        {PRESETS.map((value) => (
          <button key={value} type="button" className={`btn btn--ghost btn--sm${amount === value ? ' is-on' : ''}`} onClick={() => setAmount(value)}>
            {value.toLocaleString('fr-FR')}
          </button>
        ))}
      </div>
      <div className="code-maker__actions">
        <button type="button" className="btn btn--primary" disabled={!valid} onClick={create}>
          Créer le code
        </button>
        <button type="button" className="btn btn--gold" disabled={!valid} onClick={credit}>
          Créditer ma partie
        </button>
      </div>
      {!valid && <p className="codes__message is-error">Un code vaut entre 1 et {MAX_CODE_BALLES.toLocaleString('fr-FR')} balles.</p>}
      {last && (
        <div className="code-maker__result">
          <input readOnly value={last} aria-label="Code créé" onFocus={(event) => event.target.select()} />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => copy(last)}>
            {copied === last ? 'Copié !' : 'Copier'}
          </button>
        </div>
      )}
      {madeCodes.length > 0 && (
        <ul className="code-list" aria-label="Derniers codes créés">
          {madeCodes.map((made) => (
            <li key={made.code}>
              <code>{made.code}</code>
              <Balles value={made.balles} />
              <span className="muted small">{redeemed.includes(made.code) ? 'utilisé ici' : ''}</span>
              <button type="button" className="btn btn--ghost btn--xs" onClick={() => copy(made.code)}>
                {copied === made.code ? 'Copié !' : 'Copier'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
