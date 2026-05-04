import { applyParamsToScript, resolveScriptHash, stringToHex } from '@meshsdk/core';
import scriptJson from './script.json';

const rawCompiledCode = scriptJson.validators[0].compiledCode;

export function getAppliedScript(eventUuid: string, eventName: string): string {
  return applyParamsToScript(rawCompiledCode, [
    stringToHex(eventUuid),
    stringToHex(eventName),
  ]);
}

export function getPolicyId(appliedScript: string): string {
  return resolveScriptHash(appliedScript, 'V3');
}