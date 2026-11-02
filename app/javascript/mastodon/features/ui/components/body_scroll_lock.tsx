import { useLayoutEffect } from 'react';

import { createAppSelector, useAppSelector } from 'mastodon/store';

// Modals that keep the page underneath scrollable (longwhile: the schedule
// picker is used alongside the compose form).
const SCROLL_UNLOCKED_MODALS: readonly string[] = ['SCHEDULE'];

const getShouldLockBodyScroll = createAppSelector(
  [
    (state) => state.navigation.open,
    (state) =>
      state.modal
        .get('stack')
        .some(
          (modal) => !SCROLL_UNLOCKED_MODALS.includes(modal.get('modalType')),
        ),
  ],
  (isMobileMenuOpen: boolean, isModalOpen: boolean) =>
    isMobileMenuOpen || isModalOpen,
);

/**
 * This component locks scrolling on the body when
 * `getShouldLockBodyScroll` returns true.
 */

export const BodyScrollLock: React.FC = () => {
  const shouldLockBodyScroll = useAppSelector(getShouldLockBodyScroll);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle(
      'has-modal',
      shouldLockBodyScroll,
    );
  }, [shouldLockBodyScroll]);

  return null;
};
