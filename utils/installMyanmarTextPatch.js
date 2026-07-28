/**
 * Global Myanmar / Burmese text anti-clipping patch.
 *
 * Must be imported before any screen renders (see index.js).
 * When UI locale is Myanmar — or a string contains Myanmar script — Text and
 * TextInput styles are rewritten so tight Latin lineHeights and Georgia/serif
 * fonts cannot clip ascenders.
 */

import React from 'react';
import { Text, TextInput } from 'react-native';
import {
  applyMyanmarUiStyle,
  extractRenderableText,
  isMyanmarUiActive,
  textNeedsMyanmarMetrics,
} from './localeText';

function shouldPatchTextProps(props) {
  if (isMyanmarUiActive()) return true;
  if (!props) return false;
  const fromChildren = extractRenderableText(props.children);
  if (textNeedsMyanmarMetrics(fromChildren)) return true;
  if (textNeedsMyanmarMetrics(props.value)) return true;
  if (textNeedsMyanmarMetrics(props.placeholder)) return true;
  if (textNeedsMyanmarMetrics(props.defaultValue)) return true;
  return false;
}

function patchTextProps(type, props) {
  if (!shouldPatchTextProps(props)) return props;
  const next = props ? { ...props } : {};
  next.style = applyMyanmarUiStyle(props?.style);
  if (type === Text && next.includeFontPadding == null) {
    next.includeFontPadding = true;
  }
  return next;
}

function wrapCreate(original) {
  return function myanmarAwareCreate(type, props, ...children) {
    if (type === Text || type === TextInput) {
      return original(type, patchTextProps(type, props), ...children);
    }
    return original(type, props, ...children);
  };
}

function wrapJsx(original) {
  return function myanmarAwareJsx(type, props, key) {
    if (type === Text || type === TextInput) {
      return original(type, patchTextProps(type, props), key);
    }
    return original(type, props, key);
  };
}

// createElement path (older transforms / some libraries)
React.createElement = wrapCreate(React.createElement.bind(React));

// Automatic JSX runtime (Expo / Metro default)
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const jsxRuntime = require('react/jsx-runtime');
  if (jsxRuntime?.jsx) jsxRuntime.jsx = wrapJsx(jsxRuntime.jsx);
  if (jsxRuntime?.jsxs) jsxRuntime.jsxs = wrapJsx(jsxRuntime.jsxs);
} catch {
  // ignore — createElement path still applies
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const jsxDev = require('react/jsx-dev-runtime');
  if (jsxDev?.jsx) jsxDev.jsx = wrapJsx(jsxDev.jsx);
  if (jsxDev?.jsxs) jsxDev.jsxs = wrapJsx(jsxDev.jsxs);
  if (jsxDev?.jsxDEV) jsxDev.jsxDEV = wrapJsx(jsxDev.jsxDEV);
} catch {
  // production builds may omit jsx-dev-runtime
}
