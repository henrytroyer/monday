import { CONTACT_ALPHABET_INDEX } from '../../utils/contactSortLetter';

interface ContactAlphabetIndexProps {
  availableLetters: ReadonlySet<string>;
  onSelect: (letter: string) => void;
}

export default function ContactAlphabetIndex({
  availableLetters,
  onSelect,
}: ContactAlphabetIndexProps) {
  return (
    <nav
      aria-label="Jump to contacts by letter"
      className="flex h-full min-h-0 w-8 shrink-0 flex-col items-stretch rounded-xl border border-crm-taupe/15 bg-crm-surface/90 px-0.5 py-1 shadow-sm backdrop-blur-sm"
    >
      {CONTACT_ALPHABET_INDEX.map((letter) => {
        const enabled = availableLetters.has(letter);
        return (
          <button
            key={letter}
            type="button"
            disabled={!enabled}
            onClick={() => enabled && onSelect(letter)}
            aria-label={
              enabled
                ? `Jump to contacts starting with ${letter === '#' ? 'non-letter' : letter}`
                : `No contacts starting with ${letter === '#' ? 'non-letter' : letter}`
            }
            className={`flex min-h-0 flex-1 items-center justify-center rounded text-[11px] font-semibold leading-none transition duration-150 ${
              enabled
                ? 'cursor-pointer text-crm-slate/70 hover:scale-110 hover:text-crm-indigo'
                : 'cursor-default text-crm-slate/25'
            }`}
          >
            {letter}
          </button>
        );
      })}
    </nav>
  );
}
