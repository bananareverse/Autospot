declare module 'react-native-maps-directions' {
  import { Component } from 'react';
  import { Marker } from 'react-native-maps';

  export interface MapViewDirectionsProps {
    origin?: any;
    waypoint?: any;
    destination?: any;
    apikey: string;
    onStart?: (...args: any[]) => any;
    onReady?: (...args: any[]) => any;
    onError?: (...args: any[]) => any;
    strokeWidth?: number;
    strokeColor?: string;
    strokeColors?: string[];
    lineCap?: string;
    lineJoin?: string;
    miterLimit?: number;
    geodesic?: boolean;
    lineDashPhase?: number;
    lineDashPattern?: number[];
    precision?: 'high' | 'low';
    timePrecision?: 'now';
    channel?: string;
    mode?: 'DRIVING' | 'BICYCLING' | 'TRANSIT' | 'WALKING';
    language?: string;
    optimizeWaypoints?: boolean;
    splitWaypoints?: boolean;
    directionsServiceBaseUrl?: string;
    region?: string;
    resetOnChange?: boolean;
  }

  export default class MapViewDirections extends Component<MapViewDirectionsProps> {}
}
