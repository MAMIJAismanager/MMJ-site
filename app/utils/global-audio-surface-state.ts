export type GlobalAudioSurfaceMode =
  | 'collapsed'
  | 'expanded'

export type GlobalAudioSurfaceInitialization =
  | 'uninitialized'
  | 'initialized'

export interface GlobalAudioSurfaceState {
  readonly initialization: GlobalAudioSurfaceInitialization
  readonly mode: GlobalAudioSurfaceMode
  readonly userOverride: boolean
}

export type GlobalAudioSurfaceTransition =
  | Readonly<{
      kind: 'initialize'
      mobile: boolean
    }>
  | Readonly<{
      kind: 'expand'
    }>
  | Readonly<{
      kind: 'collapse'
    }>

export function createInitialGlobalAudioSurfaceState():
GlobalAudioSurfaceState {
  return {
    initialization: 'uninitialized',
    mode: 'collapsed',
    userOverride: false,
  }
}

export function reduceGlobalAudioSurfaceState(
  state: GlobalAudioSurfaceState,
  transition: GlobalAudioSurfaceTransition,
): GlobalAudioSurfaceState {
  switch (transition.kind) {
    case 'initialize':
      if (state.initialization === 'initialized') return state
      return {
        initialization: 'initialized',
        mode: transition.mobile ? 'collapsed' : 'expanded',
        userOverride: false,
      }

    case 'expand':
      if (
        state.initialization === 'initialized'
        && state.mode === 'expanded'
        && state.userOverride
      ) {
        return state
      }
      return {
        initialization: 'initialized',
        mode: 'expanded',
        userOverride: true,
      }

    case 'collapse':
      if (
        state.initialization === 'initialized'
        && state.mode === 'collapsed'
        && state.userOverride
      ) {
        return state
      }
      return {
        initialization: 'initialized',
        mode: 'collapsed',
        userOverride: true,
      }
  }
}
