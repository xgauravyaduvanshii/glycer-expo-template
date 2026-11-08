import React, { useEffect, useRef } from "react";
import {
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";

// AI NOTE: Update this screen when you want to show your real app.

export default function Index() {
  // Mobile animation fallback values
  const spinClockwise = useRef(new Animated.Value(0)).current;
  const spinCounter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinClockwise, {
        toValue: 1,
        duration: 6500,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();

    Animated.loop(
      Animated.timing(spinCounter, {
        toValue: 1,
        duration: 8500,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();
  }, [spinClockwise, spinCounter]);

  const nativeRotateCW = spinClockwise.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const nativeRotateCCW = spinCounter.interpolate({
    inputRange: [0, 1],
    outputRange: ["360deg", "0deg"],
  });

  return (
    <View style={styles.container}>
      {/* Seamless CSS Keyframe Animations for Web */}
      {Platform.OS === "web" && (
        <style>{`
          /* Continuous Ring Rotations */
          @keyframes spin-cw {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes spin-ccw {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
          }

          /* Fluid Liquid Flow inside the rings (Surge / Wave flow along the path) */
          @keyframes fluid-flow-red {
            0% {
              stroke-dashoffset: 428;
              filter: drop-shadow(0 0 2px rgba(255, 42, 95, 0.4));
            }
            50% {
              filter: drop-shadow(0 0 7px rgba(255, 42, 95, 0.95)) drop-shadow(0 0 14px rgba(255, 42, 95, 0.5));
            }
            100% {
              stroke-dashoffset: 0;
              filter: drop-shadow(0 0 2px rgba(255, 42, 95, 0.4));
            }
          }

          @keyframes fluid-flow-teal {
            0% {
              stroke-dashoffset: 0;
              filter: drop-shadow(0 0 2px rgba(0, 199, 183, 0.4));
            }
            50% {
              filter: drop-shadow(0 0 7px rgba(0, 199, 183, 0.95)) drop-shadow(0 0 14px rgba(0, 199, 183, 0.5));
            }
            100% {
              stroke-dashoffset: 346;
              filter: drop-shadow(0 0 2px rgba(0, 199, 183, 0.4));
            }
          }

          .anim-spin-cw {
            animation: spin-cw 6.5s linear infinite !important;
          }
          .anim-spin-ccw {
            animation: spin-ccw 8.5s linear infinite !important;
          }
          .anim-fluid-red {
            animation: fluid-flow-red 4s ease-in-out infinite alternate !important;
          }
          .anim-fluid-teal {
            animation: fluid-flow-teal 3.5s ease-in-out infinite alternate !important;
          }
        `}</style>
      )}

      <View style={styles.centerContent}>
        {/* Dynamic Rings Container */}
        <View style={styles.orbWrapper}>
          {/* Subtle Ambient Radial Glow behind the Orb */}
          <View style={styles.ambientGlow} />

          {/* OUTER RING (Crimson Red with Integrated Liquid Fluid Flow) */}
          <Animated.View
            style={[
              styles.ringContainer,
              Platform.OS !== "web" && { transform: [{ rotate: nativeRotateCCW }] },
            ]}
            // @ts-ignore
            className="anim-spin-ccw"
          >
            <Svg width={152} height={152} viewBox="0 0 152 152">
              <Defs>
                <SvgGradient id="redFluidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#FF2A5F" stopOpacity="1" />
                  <Stop offset="40%" stopColor="#FF2A5F" stopOpacity="0.8" />
                  <Stop offset="75%" stopColor="#990024" stopOpacity="0.25" />
                  <Stop offset="100%" stopColor="#2E0008" stopOpacity="0" />
                </SvgGradient>
              </Defs>
              {/* Faint Guide Track */}
              <Circle
                cx="76"
                cy="76"
                r="68"
                stroke="rgba(255, 42, 95, 0.15)"
                strokeWidth="1.5"
                fill="none"
              />
              {/* Flowing Molten Fluid Stream */}
              <Circle
                cx="76"
                cy="76"
                r="68"
                stroke="url(#redFluidGrad)"
                strokeWidth="2.5"
                strokeDasharray="210 218"
                strokeLinecap="round"
                fill="none"
                // @ts-ignore
                className="anim-fluid-red"
              />
              {/* Glowing Fluid Leading Droplet / Beacon */}
              <Circle
                cx="76"
                cy="8"
                r="3.5"
                fill="#FF2A5F"
                // @ts-ignore
                className="anim-fluid-red"
              />
            </Svg>
          </Animated.View>

          {/* INNER RING (Netlify Teal with Integrated Liquid Fluid Flow) */}
          <Animated.View
            style={[
              styles.ringContainer,
              Platform.OS !== "web" && { transform: [{ rotate: nativeRotateCW }] },
            ]}
            // @ts-ignore
            className="anim-spin-cw"
          >
            <Svg width={152} height={152} viewBox="0 0 152 152">
              <Defs>
                <SvgGradient id="tealFluidGrad" x1="100%" y1="100%" x2="0%" y2="0%">
                  <Stop offset="0%" stopColor="#00C7B7" stopOpacity="1" />
                  <Stop offset="40%" stopColor="#00C7B7" stopOpacity="0.8" />
                  <Stop offset="75%" stopColor="#0E8C80" stopOpacity="0.25" />
                  <Stop offset="100%" stopColor="#002924" stopOpacity="0" />
                </SvgGradient>
              </Defs>
              {/* Faint Guide Track */}
              <Circle
                cx="76"
                cy="76"
                r="55"
                stroke="rgba(0, 199, 183, 0.15)"
                strokeWidth="1.5"
                fill="none"
              />
              {/* Flowing Molten Fluid Stream */}
              <Circle
                cx="76"
                cy="76"
                r="55"
                stroke="url(#tealFluidGrad)"
                strokeWidth="2.5"
                strokeDasharray="165 181"
                strokeLinecap="round"
                fill="none"
                // @ts-ignore
                className="anim-fluid-teal"
              />
              {/* Glowing Fluid Leading Droplet / Beacon */}
              <Circle
                cx="76"
                cy="131"
                r="3"
                fill="#00C7B7"
                // @ts-ignore
                className="anim-fluid-teal"
              />
            </Svg>
          </Animated.View>

          {/* Central 3D Orb: COMPLETELY STILL & SHARP */}
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.icon}
            contentFit="contain"
          />
        </View>

        <Text style={styles.title}>Welcome to Glycer</Text>
        <Text style={styles.subtitle}>
          Synthesizing your mobile experience. Your native app will emerge here shortly.
        </Text>
        <ActivityIndicator
          size="large"
          color="#FF2A5F"
          style={styles.loader}
        />
        <Text style={styles.vibeText}>Crafting native magic... ⚡</Text>
      </View>

      {/* Footer Branding */}
      <View style={styles.footer}>
        <Text style={styles.footerPrefix}>by</Text>
        <View style={styles.brandRow}>
          <Svg
            width={22}
            height={14}
            viewBox="0 0 24 16"
            fill="none"
            style={styles.brandIcon}
          >
            <Path
              d="M18 3.5C15.4 3.5 13.7 8 12 8C10.3 8 8.6 3.5 6 3.5C3.8 3.5 2 5.5 2 8C2 10.5 3.8 12.5 6 12.5C8.6 12.5 10.3 8 12 8C13.7 8 15.4 12.5 18 12.5C20.2 12.5 22 10.5 22 8C22 5.5 20.2 3.5 18 3.5Z"
              stroke="#00C7B7"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.brandName}>flyingdarkdev</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#000000",
    padding: 32,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  orbWrapper: {
    width: 156,
    height: 156,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
    position: "relative",
  },
  ambientGlow: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(0, 199, 183, 0.12)",
  },
  ringContainer: {
    position: "absolute",
    width: 152,
    height: 152,
    justifyContent: "center",
    alignItems: "center",
  },
  icon: {
    width: 96,
    height: 96,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  loader: {
    marginBottom: 24,
  },
  vibeText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#00C7B7",
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 16,
  },
  footerPrefix: {
    fontSize: 13,
    color: "#6B7280",
    marginRight: 6,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandIcon: {
    marginRight: 6,
  },
  brandName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E5E7EB",
    letterSpacing: 0.5,
  },
});
