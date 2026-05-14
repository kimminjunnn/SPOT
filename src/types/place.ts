// src/types/place.ts

export type ApiPlace = {
  placeId: number;
  gId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  list: string;
  photo: string | null;
  ratingAvg: number;
  ratingCount: number;
  myRating: number | null;
  savers: {
    nickname: string;
    profileImageUrl: string;
  }[];
  distance: number;
  isMarked: boolean;
};

export type Place = {
  placeId: number | null;
  id: string; // unique key (placeId 또는 gid 문자열)
  name: string;
  address: string;

  lat: number;
  lng: number;

  category: string | null;
  categoryKey?: string | null;

  photo: string | null;
  thumbnails: string[];

  ratingAvg: number | null;
  ratingCount: number | null;
  myRating: number | null;

  savers: { nickname: string; profileImageUrl: string }[];
  distanceM?: number;

  isBookmarked: boolean;
};

// ---------- /more API용 ----------

export type ApiPlaceComment = {
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

export type ApiPlaceMoreResponse = {
  places: ApiPlace;
  comments: ApiPlaceComment[];
};

export type ApiMapPlace = {
  placeId: number;
  gid?: string;
  latitude: number;
  longitude: number;
  list: string; // "cafe" 같은 카테고리
  name: string;
};

export type ApiMainMePlace = {
  address: string;
  distance: number;
  gId: string;
  isMarked: boolean;
  latitude: number;
  list: string;
  longitude: number;
  myRating: number | null;
  name: string;
  photo: string | null;
  placeId: number;
  ratingAvg: number | null;
  savers: {
    nickname: string;
    profileImageUrl: string;
  }[];
  saversCount: number;
};
