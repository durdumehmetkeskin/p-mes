import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
  Label,
} from "frontend";

const noop = () => {};

export function VerificationCode() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <Label>Confirmation code</Label>
      <InputOTP maxLength={6} value="482913" onChange={noop}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}

export function PartiallyFilled() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <Label>Enter the 6-digit code</Label>
      <InputOTP maxLength={6} value="4829" onChange={noop}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}
