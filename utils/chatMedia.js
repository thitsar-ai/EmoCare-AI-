import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const IMAGE_EXT_MEDIA = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/jpeg',
  heif: 'image/jpeg',
};

const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'json',
  'csv',
  'log',
  'js',
  'ts',
  'tsx',
  'jsx',
  'html',
  'xml',
  'yaml',
  'yml',
]);

function extensionFromUri(uri, name) {
  const source = name || uri.split('?')[0];
  const part = source.split('.').pop();
  return part ? part.toLowerCase() : '';
}

function isImageAttachment(msg) {
  if (msg.attachmentKind === 'photo') return true;
  const ext = extensionFromUri(msg.attachmentUri ?? '', msg.attachmentName);
  return Boolean(IMAGE_EXT_MEDIA[ext]);
}

async function loadImageBlocks(uri, caption) {
  let base64;
  let mediaType = 'image/jpeg';

  try {
    const manipulated = await manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.82, format: SaveFormat.JPEG, base64: true },
    );
    base64 = manipulated.base64;
    mediaType = 'image/jpeg';
  } catch {
    base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const ext = extensionFromUri(uri);
    mediaType = IMAGE_EXT_MEDIA[ext] ?? 'image/jpeg';
  }

  if (!base64) {
    throw new Error('Could not read image');
  }

  const prompt =
    caption && !caption.startsWith('📷')
      ? caption
      : 'I shared a photo with you. Please look at it carefully, describe what you notice if helpful, and respond with warmth.';

  return [
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: base64,
      },
    },
    { type: 'text', text: prompt },
  ];
}

const PDF_MAX_BYTES = 32 * 1024 * 1024;

function isPdfFile(uri, name) {
  return extensionFromUri(uri, name) === 'pdf';
}

async function loadPdfBlocks(uri, name, caption) {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new Error('PDF not found');
  }
  if (typeof info.size === 'number' && info.size > PDF_MAX_BYTES) {
    throw new Error('PDF exceeds 32 MB limit');
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (!base64) {
    throw new Error('Could not read PDF');
  }

  const prompt =
    caption && !caption.includes('Can you read')
      ? caption
      : `I shared a PDF called "${name}". Please read it carefully, summarize the key points if helpful, and respond with warmth.`;

  return [
    {
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: base64,
      },
    },
    { type: 'text', text: prompt },
  ];
}

async function loadFileText(uri, name, caption) {
  const text = await FileSystem.readAsStringAsync(uri);
  const trimmed = text.slice(0, 14000);
  const header = caption || `📎 ${name}`;
  return `${header}\n\n--- ${name} ---\n${trimmed}`;
}

/**
 * Build Anthropic /messages payload from persisted chat rows (skips welcome).
 * @param {Array<{ role: 'user' | 'bot', text: string, attachmentUri?: string, attachmentKind?: string, attachmentName?: string }>} chatMessages
 */
export async function buildAnthropicMessagesFromChat(chatMessages) {
  const rows = chatMessages.filter((m) => m.id !== 'welcome');
  const out = [];

  for (const msg of rows) {
    if (msg.role === 'bot') {
      const text = msg.text?.trim();
      if (!text) continue;
      out.push({ role: 'assistant', content: text });
      continue;
    }

    if (msg.attachmentUri && isImageAttachment(msg)) {
      try {
        const blocks = await loadImageBlocks(msg.attachmentUri, msg.text);
        out.push({ role: 'user', content: blocks });
        continue;
      } catch {
        out.push({
          role: 'user',
          content: `${msg.text}\n\n(I tried to share a photo, but it could not be read on this device.)`,
        });
        continue;
      }
    }

    if (msg.attachmentUri && msg.attachmentKind === 'file') {
      const name = msg.attachmentName || 'file';
      const ext = extensionFromUri(msg.attachmentUri, name);

      if (TEXT_EXTENSIONS.has(ext)) {
        try {
          const content = await loadFileText(msg.attachmentUri, name, msg.text);
          out.push({ role: 'user', content });
          continue;
        } catch {
          out.push({
            role: 'user',
            content: `${msg.text}\n\n(I shared ${name}, but I couldn't open it here.)`,
          });
          continue;
        }
      }

      if (isPdfFile(msg.attachmentUri, name)) {
        try {
          const blocks = await loadPdfBlocks(msg.attachmentUri, name, msg.text);
          out.push({ role: 'user', content: blocks });
          continue;
        } catch (err) {
          const reason =
            err instanceof Error && err.message.includes('32 MB')
              ? 'This PDF is over the 32 MB limit.'
              : 'This PDF could not be read on this device.';
          out.push({
            role: 'user',
            content: `${msg.text}\n\n(${reason})`,
          });
          continue;
        }
      }

      if (IMAGE_EXT_MEDIA[ext]) {
        try {
          const blocks = await loadImageBlocks(msg.attachmentUri, msg.text);
          out.push({ role: 'user', content: blocks });
          continue;
        } catch {
          // fall through
        }
      }

      out.push({
        role: 'user',
        content: `${msg.text}\n\n(Shared file: ${name}. If you can, ask me to describe what's in it — some file types can't be opened directly in chat yet.)`,
      });
      continue;
    }

    out.push({ role: 'user', content: msg.text });
  }

  return out;
}
