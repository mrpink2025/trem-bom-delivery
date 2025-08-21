import React from 'react';
import { SmartAddressInput } from './SmartAddressInput';

interface AddressInputProps {
  onAddressChange?: (address: any) => void;
}

export function AddressInput({ onAddressChange }: AddressInputProps) {
  return <SmartAddressInput onAddressChange={onAddressChange} />;
}