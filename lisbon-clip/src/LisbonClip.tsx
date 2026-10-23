import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {loadFont as loadSerif} from '@remotion/google-fonts/PlayfairDisplay';
import {loadFont as loadSans} from '@remotion/google-fonts/Inter';
import photosJson from './photos.json';

const {fontFamily: serif} = loadSerif('normal', {weights: ['400', '700']});
const {fontFamily: sans} = loadSans('normal', {weights: ['300']});

type Photo = {file: string; width: number; height: number; takenAt: number};
const photos = photosJson as Photo[];

const FPS = 30;
const PHOTO_FRAMES = 5 * FPS;
const INTRO_FRAMES = 5 * FPS;
const OUTRO_FRAMES = 5 * FPS;
const FINALE_FRAMES = 7 * FPS;
const FADE_FRAMES = Math.round(1.2 * FPS);

const photoFrames = (index: number, count: number) =>
  index === count - 1 ? FINALE_FRAMES : PHOTO_FRAMES;

export const totalDuration = (count: number) =>
  INTRO_FRAMES +
  Array.from({length: count}, (_, i) => photoFrames(i, count)).reduce((a, b) => a + b, 0) +
  OUTRO_FRAMES -
  (count + 1) * FADE_FRAMES;

// The last photo is the group shot: barely move, so nobody at the edges is cropped.
const FINALE_MOVE = {fromScale: 1.0, toScale: 1.05, fromX: 0, toX: 0, fromY: 0, toY: 0};

// Each photo gets its own slow camera move so consecutive shots never feel the same.
const MOVES = [
  {fromScale: 1.0, toScale: 1.12, fromX: 0, toX: 0, fromY: 0, toY: 0},
  {fromScale: 1.14, toScale: 1.04, fromX: -3, toX: 3, fromY: 0, toY: 0},
  {fromScale: 1.06, toScale: 1.16, fromX: 2, toX: -2, fromY: 2, toY: -1},
  {fromScale: 1.15, toScale: 1.02, fromX: 0, toX: 0, fromY: -3, toY: 2},
  {fromScale: 1.04, toScale: 1.13, fromX: -2, toX: 2, fromY: 1, toY: -2},
];

const KenBurns: React.FC<{
  photo: Photo;
  index: number;
  duration: number;
  finale: boolean;
}> = ({photo, index, duration, finale}) => {
  const frame = useCurrentFrame();
  const move = finale ? FINALE_MOVE : MOVES[index % MOVES.length];
  const t = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateRight: 'clamp',
  });
  const scale = move.fromScale + (move.toScale - move.fromScale) * t;
  const x = move.fromX + (move.toX - move.fromX) * t;
  const y = move.fromY + (move.toY - move.fromY) * t;
  const src = staticFile(photo.file);
  const isPortrait = photo.height > photo.width * 1.05;

  if (isPortrait) {
    // Portrait shots: full photo in the middle over a blurred, enlarged copy of itself.
    return (
      <AbsoluteFill style={{backgroundColor: '#000'}}>
        <Img
          src={src}
          style={{
            position: 'absolute',
            inset: -80,
            width: 'calc(100% + 160px)',
            height: 'calc(100% + 160px)',
            objectFit: 'cover',
            filter: 'blur(40px) brightness(0.55) saturate(1.2)',
            transform: `scale(${1.1 + t * 0.05})`,
          }}
        />
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
          <Img
            src={src}
            style={{
              height: '100%',
              objectFit: 'contain',
              boxShadow: '0 0 80px rgba(0,0,0,0.6)',
              transform: `scale(${0.92 + t * 0.06}) translateY(${y * 0.5}%)`,
            }}
          />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden'}}>
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: finale ? 'center 70%' : 'center',
          transform: `scale(${scale}) translate(${x}%, ${y}%)`,
        }}
      />
    </AbsoluteFill>
  );
};

// Soft vignette plus a slight warm grade to give the photos one shared look.
const Grade: React.FC = () => (
  <>
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)',
      }}
    />
    <AbsoluteFill
      style={{backgroundColor: 'rgba(255, 170, 90, 0.06)', mixBlendMode: 'soft-light'}}
    />
  </>
);

const TitleCard: React.FC<{
  photo?: Photo;
  title: string;
  subtitle: string;
  duration: number;
  fadeOut: boolean;
}> = ({photo, title, subtitle, duration, fadeOut}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const titleIn = interpolate(frame, [0.4 * fps, 1.8 * fps], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const subIn = interpolate(frame, [1.4 * fps, 2.6 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const toBlack = fadeOut
    ? interpolate(frame, [duration - 1.5 * fps, duration], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const spacing = interpolate(titleIn, [0, 1], [0.6, 0.25]);

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {photo ? (
        <Img
          src={staticFile(photo.file)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(14px) brightness(0.45)',
            transform: `scale(${1.15 + frame / (duration * 12)})`,
          }}
        />
      ) : null}
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', color: '#fff'}}>
        <div
          style={{
            fontFamily: serif,
            fontWeight: 700,
            fontSize: 190,
            letterSpacing: `${spacing}em`,
            marginRight: `-${spacing}em`,
            opacity: titleIn,
            transform: `translateY(${(1 - titleIn) * 30}px)`,
            textShadow: '0 4px 40px rgba(0,0,0,0.5)',
          }}
        >
          {title}
        </div>
        <div
          style={{
            width: interpolate(subIn, [0, 1], [0, 220]),
            height: 2,
            backgroundColor: '#f2c27b',
            margin: '28px 0',
          }}
        />
        <div
          style={{
            fontFamily: sans,
            fontWeight: 300,
            fontSize: 40,
            letterSpacing: '0.4em',
            marginRight: '-0.4em',
            textTransform: 'uppercase',
            opacity: subIn,
          }}
        >
          {subtitle}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{backgroundColor: '#000', opacity: toBlack}} />
    </AbsoluteFill>
  );
};

const tripYear = () => {
  const first = photos[0];
  return first ? new Date(first.takenAt).getFullYear() : new Date().getFullYear();
};

export const LisbonClip: React.FC = () => {
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={INTRO_FRAMES}>
          <TitleCard
            photo={photos[0]}
            title="Lisboa"
            subtitle={`Portugal · ${tripYear()}`}
            duration={INTRO_FRAMES}
            fadeOut={false}
          />
        </TransitionSeries.Sequence>
        {photos.flatMap((photo, i) => [
          <TransitionSeries.Transition
            key={`t-${photo.file}`}
            presentation={fade()}
            timing={linearTiming({durationInFrames: FADE_FRAMES})}
          />,
          <TransitionSeries.Sequence
            key={photo.file}
            durationInFrames={photoFrames(i, photos.length)}
          >
            <KenBurns
              photo={photo}
              index={i}
              duration={photoFrames(i, photos.length)}
              finale={i === photos.length - 1}
            />
            <Grade />
          </TransitionSeries.Sequence>,
        ])}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({durationInFrames: FADE_FRAMES})}
        />
        <TransitionSeries.Sequence durationInFrames={OUTRO_FRAMES}>
          <TitleCard
            photo={photos[photos.length - 1]}
            title="Até já"
            subtitle="Obrigado, Lisboa"
            duration={OUTRO_FRAMES}
            fadeOut
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
