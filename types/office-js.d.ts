/* Minimal Office.js types for Outlook task pane (Phase 1). */

declare namespace Office {
  enum AsyncResultStatus {
    Succeeded = "succeeded",
    Failed = "failed",
  }

  enum CoercionType {
    Text = "text",
  }

  interface AsyncResult<T> {
    status: AsyncResultStatus;
    value: T;
    error?: { message?: string };
  }

  interface EmailAddressDetails {
    emailAddress: string;
    displayName?: string;
  }

  interface Item {
    from?: EmailAddressDetails;
    body: {
      getAsync(
        coercionType: CoercionType,
        callback: (result: AsyncResult<string>) => void,
      ): void;
    };
  }

  interface Mailbox {
    item?: Item;
  }

  interface Context {
    mailbox: Mailbox;
  }

  interface HostInfo {
    host?: string;
    platform?: string;
  }

  function onReady(callback: (info: HostInfo) => void): void;

  const context: Context;
}

declare const Office: typeof Office;
