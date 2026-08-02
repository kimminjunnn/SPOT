import { getProfileFriendPhotoSlots } from "./profileFriendPhotoSlots";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    throw new Error(`${message}\nactual: ${actualJson}\nexpected: ${expectedJson}`);
  }
}

assertEqual(
  getProfileFriendPhotoSlots(["https://example.com/friend.png"], 2),
  ["https://example.com/friend.png", null],
  "pads an omitted default-profile friend up to friend_count",
);

assertEqual(
  getProfileFriendPhotoSlots([], 2),
  [null, null],
  "renders a fallback slot for every friend without a photo",
);

assertEqual(
  getProfileFriendPhotoSlots(["first", "second", "third", "fourth"], 4),
  ["first", "second", "third"],
  "limits the profile preview to three avatars",
);

assertEqual(
  getProfileFriendPhotoSlots(["stale-photo"], 0),
  [],
  "does not render stale preview photos when there are no friends",
);

assertEqual(
  getProfileFriendPhotoSlots(["   ", undefined], 2),
  [null, null],
  "treats blank and invalid photo values as default-profile slots",
);
