import type { LanguageModelV3StreamPart } from '@ai-sdk/provider';
import { convertUint8ArrayToBase64 } from '@ai-sdk/provider-utils';
import type { UIMessageChunk } from 'ai';
import { mapStreamPartToUIChunks, type MappableStreamPart } from 'ai/internal';

/**
 * Options for creating the provider stream to UI chunk transform.
 */
export interface ProviderStreamToUIChunkTransformOptions {
  /**
   * Whether to emit a 'start' chunk at the beginning of the stream.
   */
  sendStart?: boolean;

  /**
   * The message ID to include in the start chunk.
   */
  messageId?: string;
}

/**
 * Normalize a LanguageModelV3StreamPart to the MappableStreamPart interface
 * so it can be processed by the shared mapStreamPartToUIChunks function.
 */
function normalizeV3Part(
  part: LanguageModelV3StreamPart,
): MappableStreamPart | null {
  switch (part.type) {
    case 'file': {
      let url: string;
      const fileData = part.data;
      if (fileData instanceof Uint8Array) {
        const base64 = convertUint8ArrayToBase64(fileData);
        url = `data:${part.mediaType};base64,${base64}`;
      } else if (
        fileData.startsWith('data:') ||
        fileData.startsWith('http:') ||
        fileData.startsWith('https:')
      ) {
        url = fileData;
      } else {
        url = `data:${part.mediaType};base64,${fileData}`;
      }
      return { type: 'file', url, mediaType: part.mediaType };
    }

    case 'tool-call': {
      // TODO: replace JSON.parse with parseJSON from @ai-sdk/provider-utils
      return {
        type: 'tool-call',
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        input: JSON.parse(part.input || '{}'),
        providerExecuted: part.providerExecuted,
        providerMetadata: part.providerMetadata,
        dynamic: part.dynamic,
      };
    }

    case 'tool-result': {
      return {
        type: 'tool-result',
        toolCallId: part.toolCallId,
        output: part.result,
      };
    }

    // Structurally compatible — pass through
    case 'text-start':
    case 'text-delta':
    case 'text-end':
    case 'reasoning-start':
    case 'reasoning-delta':
    case 'reasoning-end':
    case 'source':
    case 'tool-input-start':
    case 'tool-input-delta':
    case 'tool-input-end':
    case 'tool-approval-request':
    case 'error':
      return part as unknown as MappableStreamPart;

    // Internal V3 events — no UI representation
    case 'stream-start':
    case 'response-metadata':
    case 'finish':
    case 'raw':
      return null;

    default:
      return null;
  }
}

/**
 * Creates a TransformStream that converts LanguageModelV3StreamPart chunks
 * to UIMessageChunk chunks.
 *
 * Internally normalizes V3 stream parts and delegates to the shared
 * mapStreamPartToUIChunks function from the ai package.
 */
export function createProviderStreamToUIChunkTransform(
  options?: ProviderStreamToUIChunkTransformOptions,
): TransformStream<LanguageModelV3StreamPart, UIMessageChunk> {
  const sendStart = options?.sendStart ?? false;

  return new TransformStream<LanguageModelV3StreamPart, UIMessageChunk>({
    start(controller) {
      if (sendStart) {
        controller.enqueue({
          type: 'start',
          ...(options?.messageId != null
            ? { messageId: options.messageId }
            : {}),
        });
      }
      controller.enqueue({
        type: 'start-step',
      });
    },

    flush(controller) {
      controller.enqueue({
        type: 'finish-step',
      });
    },

    transform(part, controller) {
      const normalized = normalizeV3Part(part);
      if (normalized == null) return;

      const chunks = mapStreamPartToUIChunks(normalized);
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
    },
  });
}
