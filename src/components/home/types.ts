import { HOME_TABS } from "./constants";

export type HomeTab = (typeof HOME_TABS)[number];
export type HomeTabKey = HomeTab["key"];

export type HomeMarker = {
  key: string;
  lat: number;
  lng: number;
  imageUrl?: string;
  raw: any;
};

export type HomeScope =
  | { type: "me" }
  | { type: "friends" }
  | { type: "friend"; userId: number };

export type HomePlaceItem = {
  id: number;
  placeId?: number;
  gid: string;
  photos: string[];
  name: string;
  address: string;
  rating: number;
  ratingCount: number;
  list: string; // restaurant | cafe | ...
  savedCount: number;
  searchCount: number;
  score: number;
  distance: number;
  lat: number;
  lng: number;
  memPhotos: string[];
  comment: string;
  commentCount: number;
  memId: number;
  commentPhoto: string;
  marked: boolean;
};

export type HomeCommentItem = {
  id: number;
  placeId: number;
  gid: string;
  photos: string[];
  name: string;
  address: string;
  score: number;
  comment: string;
  memId: number;
  memEmail: string;
  commentPhoto: string;
  createdAt: string;
  marked: boolean;
};
