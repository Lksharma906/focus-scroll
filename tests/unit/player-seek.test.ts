import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayerController } from '../../src/player/controller';
import { HUD } from '../../src/components/hud';
import { SeekIndicator } from '../../src/components/seek-indicator';

describe('Video Player 30-Second Seek Capability', () => {
  describe('PlayerController seeking', () => {
    let controller: PlayerController;
    let mockYTPlayer: {
      seekTo: ReturnType<typeof vi.fn>;
      getCurrentTime: ReturnType<typeof vi.fn>;
      getDuration: ReturnType<typeof vi.fn>;
      playVideo: ReturnType<typeof vi.fn>;
      pauseVideo: ReturnType<typeof vi.fn>;
      cueVideoById: ReturnType<typeof vi.fn>;
      loadVideoById: ReturnType<typeof vi.fn>;
      unMute: ReturnType<typeof vi.fn>;
      mute: ReturnType<typeof vi.fn>;
      isMuted: ReturnType<typeof vi.fn>;
      getPlayerState: ReturnType<typeof vi.fn>;
      destroy: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      controller = new PlayerController();
      mockYTPlayer = {
        seekTo: vi.fn(),
        getCurrentTime: vi.fn().mockReturnValue(50),
        getDuration: vi.fn().mockReturnValue(120),
        playVideo: vi.fn(),
        pauseVideo: vi.fn(),
        cueVideoById: vi.fn(),
        loadVideoById: vi.fn(),
        unMute: vi.fn(),
        mute: vi.fn(),
        isMuted: vi.fn().mockReturnValue(false),
        getPlayerState: vi.fn().mockReturnValue(1),
        destroy: vi.fn()
      };
      // Inject player instance
      (controller as unknown as { player: typeof mockYTPlayer }).player = mockYTPlayer;
    });

    it('seeks forward by 30 seconds correctly', () => {
      mockYTPlayer.getCurrentTime.mockReturnValue(20);
      const target = controller.seekBy(30);
      expect(mockYTPlayer.seekTo).toHaveBeenCalledWith(50, true);
      expect(target).toBe(50);
    });

    it('seeks backward by 30 seconds correctly', () => {
      mockYTPlayer.getCurrentTime.mockReturnValue(50);
      const target = controller.seekBy(-30);
      expect(mockYTPlayer.seekTo).toHaveBeenCalledWith(20, true);
      expect(target).toBe(20);
    });

    it('clamps to 0 when seeking backward near video start', () => {
      mockYTPlayer.getCurrentTime.mockReturnValue(15);
      const target = controller.seekBy(-30);
      expect(mockYTPlayer.seekTo).toHaveBeenCalledWith(0, true);
      expect(target).toBe(0);
    });

    it('clamps to duration when seeking forward near video end', () => {
      mockYTPlayer.getCurrentTime.mockReturnValue(110);
      mockYTPlayer.getDuration.mockReturnValue(120);
      const target = controller.seekBy(30);
      expect(mockYTPlayer.seekTo).toHaveBeenCalledWith(120, true);
      expect(target).toBe(120);
    });

    it('resumes playback and clears ended state when rewinding an ended video', () => {
      // Simulate video ended state
      const sm = (controller as unknown as { stateMachine: { transition: (a: string) => void; isEnded: () => boolean } }).stateMachine;
      sm.transition('UNLOCK_GESTURE');
      sm.transition('VIDEO_ENDED');
      expect(controller.isEnded()).toBe(true);

      mockYTPlayer.getCurrentTime.mockReturnValue(120);
      mockYTPlayer.getDuration.mockReturnValue(120);

      controller.seekBy(-30);

      expect(mockYTPlayer.seekTo).toHaveBeenCalledWith(90, true);
      expect(mockYTPlayer.playVideo).toHaveBeenCalled();
      expect(controller.isEnded()).toBe(false);
      expect(controller.getCurrentState()).toBe('PLAYING');
    });

    it('handles seekTo explicitly with boundaries', () => {
      mockYTPlayer.getDuration.mockReturnValue(100);
      controller.seekTo(45);
      expect(mockYTPlayer.seekTo).toHaveBeenCalledWith(45, true);

      controller.seekTo(-10);
      expect(mockYTPlayer.seekTo).toHaveBeenCalledWith(0, true);

      controller.seekTo(150);
      expect(mockYTPlayer.seekTo).toHaveBeenCalledWith(100, true);
    });
  });

  describe('HUD Seek Buttons', () => {
    it('renders seek-back-btn and seek-fwd-btn in hud-nav-controls', () => {
      const onSeekForward = vi.fn();
      const onSeekBackward = vi.fn();
      const hud = new HUD({
        onOpenDrawer: vi.fn(),
        onSeekForward,
        onSeekBackward
      });

      const element = hud.getElement();
      const seekBackBtn = element.querySelector('.seek-back-btn') as HTMLButtonElement;
      const seekFwdBtn = element.querySelector('.seek-fwd-btn') as HTMLButtonElement;

      expect(seekBackBtn).not.toBeNull();
      expect(seekFwdBtn).not.toBeNull();
      expect(seekBackBtn.getAttribute('aria-label')).toBe('Rewind 30 seconds');
      expect(seekFwdBtn.getAttribute('aria-label')).toBe('Forward 30 seconds');

      seekBackBtn.click();
      expect(onSeekBackward).toHaveBeenCalledTimes(1);

      seekFwdBtn.click();
      expect(onSeekForward).toHaveBeenCalledTimes(1);
    });
  });

  describe('SeekIndicator component', () => {
    it('creates DOM element and displays forward seek label with formatted timestamp', () => {
      const indicator = new SeekIndicator();
      const el = indicator.getElement();
      expect(el.classList.contains('seek-indicator')).toBe(true);

      indicator.trigger(30, 75);
      expect(el.classList.contains('show')).toBe(true);
      expect(el.classList.contains('forward')).toBe(true);
      expect(el.textContent).toContain('+30s');
      expect(el.textContent).toContain('1:15');
    });

    it('displays backward seek label with formatted timestamp', () => {
      const indicator = new SeekIndicator();
      const el = indicator.getElement();

      indicator.trigger(-30, 20);
      expect(el.classList.contains('show')).toBe(true);
      expect(el.classList.contains('backward')).toBe(true);
      expect(el.textContent).toContain('-30s');
      expect(el.textContent).toContain('0:20');
    });
  });
});
