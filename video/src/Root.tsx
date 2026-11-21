import React from 'react';
import { Composition } from 'remotion';
import { TienditaVideo, totalFrames } from './Video';
import { FPS, H, W } from './theme';

export const Root: React.FC = () => (
  <Composition id="Tiendita" component={TienditaVideo} durationInFrames={totalFrames} fps={FPS} width={W} height={H} />
);
