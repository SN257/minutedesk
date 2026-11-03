import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';

// Counts up from 0 to `value` whenever `value` changes — used for the big
// numbers in stat tiles so the dashboard feels alive rather than static.
const AnimatedCounter = ({ value, duration = 0.8 }: { value: number; duration?: number }) => {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const controls = animate(prevValue.current, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    prevValue.current = value;
    return () => controls.stop();
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
};

export default AnimatedCounter;
