"use client";

interface Props {
  onEmergency: () => void;
}

export default function EmergencyButton({ onEmergency }: Props) {
  const handleClick = () => {
    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
    onEmergency();
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Emergency SOS alert"
      className="w-full rounded-2xl bg-red-600 hover:bg-red-700 active:bg-red-800 px-6 py-5 text-2xl font-black text-white uppercase tracking-wider transition-colors shadow-lg shadow-red-900/50"
    >
      SOS Emergency
    </button>
  );
}
