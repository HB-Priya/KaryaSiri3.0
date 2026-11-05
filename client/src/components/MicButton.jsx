import { useDictation } from '../hooks/useDictation';
import { useAnnounce } from '../context/AnnounceContext';

/**
 * Renders a mic button next to a field. When pressed, dictated speech is
 * appended to the field's current value via setValue.
 */
export default function MicButton({ value, setValue, label }) {
  const announce = useAnnounce();
  const { listening, toggle, supported } = useDictation((transcript) => {
    setValue((prev) => (prev ? prev + ' ' : '') + transcript);
  });

  const handleClick = () => {
    toggle();
    announce(listening ? 'Stopped listening.' : 'Listening. Speak now.');
  };

  if (!supported) {
    return (
      <button type="button" className="btn btn-mic btn-sm" disabled title="Voice input needs Chrome">
        🎙
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-mic btn-sm"
      aria-pressed={listening}
      aria-label={label || 'Dictate by voice'}
      onClick={handleClick}
    >
      🎙
    </button>
  );
}
