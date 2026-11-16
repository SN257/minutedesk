import { Icon } from '../shell/icons';

/** Arrow that slides out to the right while a second one slides in from the left. Put it inside a `group` element. */
export const ArrowSwap = ({ size = 16 }: { size?: number }) => (
  <span className="relative inline-block shrink-0 overflow-hidden" style={{ width: size, height: size }} aria-hidden>
    <span className="absolute inset-0 grid place-items-center transition-transform duration-300 ease-out group-hover:translate-x-[170%]">{Icon.arrow(size)}</span>
    <span className="absolute inset-0 grid place-items-center transition-transform duration-300 ease-out -translate-x-[170%] group-hover:translate-x-0">{Icon.arrow(size)}</span>
  </span>
);
