import React from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";


import { AuthProvider, useAuthContext } from "./src/context/AuthContext";
import { LanguageProvider } from "./src/i18n/languagecontext";
import { navigationRef } from "./src/navigation/navigationRef";
import { C } from "./src/constants/theme";

import WelcomeScreen           from "./src/screens/Welcome/WelcomeScreen";
import LoginScreen             from "./src/screens/Auth/LoginScreen";
import RegisterScreen          from "./src/screens/Auth/RegisterScreen";
import EmailVerificationScreen from "./src/screens/Auth/EmailVerificationScreen";
import ForgotPasswordScreen    from "./src/screens/Auth/ForgotPasswordScreen";
import LivreurDashboardScreen from "./src/screens/livreur/LivreurDashboardScreen";
import ClientHomeScreen  from "./src/screens/Client/ClientHomeScreen";
import VendeurHomeScreen from "./src/screens/Home/HomeScreen";
import SellerDashboard   from "./src/screens/Seller/SellerDashboardScreen";

import CatalogueScreen   from "./src/screens/Catalogue/CatalogueScreen";
import MessagesScreen    from "./src/screens/Messages/MessagesListScreen";
import ProfilScreen      from "./src/screens/Profile/ProfilScreen";
import SubscriptionScreen from "./src/screens/Subscription/SubscriptionScreen";
import ListingDetail     from "./src/screens/Detail/ListingDetail";
import ChatScreen        from "./src/screens/Messages/ChatScreen";
import CartScreen        from "./src/screens/Cart/CartScreen";
import OrdersScreen      from "./src/screens/Orders/OrdersScreen";
import FavoritesScreen   from "./src/screens/Favorites/FavoritesScreen";
import CreateListing     from "./src/screens/Seller/CreateListingScreen";
import Notifications     from "./src/screens/Notifications/NotificationsScreen";
import AllListings       from "./src/screens/AllListings/AllListingsScreen";
import ChooseRoleScreen from "./src/screens/Auth/ChooseRoleScreen";
import { ThemeProvider } from "./src/context/themeContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import NotifBanner from "./src/components/NotifBanner";
import ErrorBoundary from "./src/components/ErrorBoundary";

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_BAR = {
  headerShown: false,
  tabBarStyle: {
    backgroundColor: C.surface, borderTopColor: C.border,
    borderTopWidth: 1, height: 64, paddingBottom: 9, paddingTop: 7,
  },
  tabBarActiveTintColor:   C.accent,
  tabBarInactiveTintColor: C.textDim,
  tabBarLabelStyle: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
};

const TabIcon = (on, off) => ({ focused, color }) =>
  <Ionicons name={focused ? on : off} size={22} color={color} />;

function ClientTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_BAR}>
      <Tab.Screen name="Accueil"   component={ClientHomeScreen}
        options={{ tabBarIcon: TabIcon("home","home-outline") }} />
      <Tab.Screen name="Catalogue" component={CatalogueScreen}
        options={{ tabBarIcon: TabIcon("search","search-outline") }} />
      <Tab.Screen name="Messages"  component={MessagesScreen}
        options={{ tabBarIcon: TabIcon("chatbubbles","chatbubbles-outline") }} />
      <Tab.Screen name="Profil"    component={ProfilScreen}
        options={{ tabBarIcon: TabIcon("person","person-outline") }} />
    </Tab.Navigator>
  );
}

function VendeurTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_BAR}>
      <Tab.Screen name="Accueil"   component={VendeurHomeScreen}
        options={{ tabBarIcon: TabIcon("home","home-outline") }} />
      <Tab.Screen name="Catalogue" component={CatalogueScreen}
        options={{ tabBarIcon: TabIcon("search","search-outline") }} />
      <Tab.Screen name="Dashboard" component={SellerDashboard}
        options={{ tabBarLabel: "Dashboard", tabBarIcon: TabIcon("stats-chart","stats-chart-outline") }} />
      <Tab.Screen name="Messages"  component={MessagesScreen}
        options={{ tabBarIcon: TabIcon("chatbubbles","chatbubbles-outline") }} />
      <Tab.Screen name="Profil"    component={ProfilScreen}
        options={{ tabBarIcon: TabIcon("person","person-outline") }} />
    </Tab.Navigator>
  );
}

function LivreurTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_BAR}>
      <Tab.Screen name="Livraisons" component={LivreurDashboardScreen}
        options={{ tabBarIcon: TabIcon("bicycle","bicycle-outline") }} />
      <Tab.Screen name="Profil" component={ProfilScreen}
        options={{ tabBarIcon: TabIcon("person","person-outline") }} />
    </Tab.Navigator>
  );
}

function MainScreen() {
  const { profile, user } = useAuthContext();
  const [minDelay, setMinDelay] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setMinDelay(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!user) {
    return <ClientTabs />;
  }

  // Attendre au moins 500ms ET que le profile soit chargé
  if (!profile || !minDelay) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", gap: 20 }}>
        <View style={{ width: 90, height: 90, borderRadius: 24, backgroundColor: C.accent + "20", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="car-sport" size={50} color={C.accent} />
        </View>
        <ActivityIndicator size="small" color={C.accent} />
      </View>
    );
  }
  
  if (profile.role === null || profile.role === undefined) {
    return <ChooseRoleScreen />;
  }
  
  if (profile.role === "livreur" || profile.role === "yalidine") return <LivreurTabs />;
  if (profile.role === "vendeur") return <VendeurTabs />;
  return <ClientTabs />;
}

function RootNavigator() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", gap: 14 }}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={{ color: C.textMuted, fontSize: 13 }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: "slide_from_right" }}
        initialRouteName={user ? "Main" : "Welcome"}
      >
        <Stack.Screen name="Welcome"           component={WelcomeScreen}           />
        <Stack.Screen name="Login"             component={LoginScreen}             />
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        <Stack.Screen name="ForgotPassword"    component={ForgotPasswordScreen}    />
        <Stack.Screen name="Main"              component={MainScreen}              />
        <Stack.Screen name="ListingDetail"     component={ListingDetail}           />
        <Stack.Screen name="Chat"              component={ChatScreen}              />
        <Stack.Screen name="Cart"              component={CartScreen}              />
        <Stack.Screen name="Orders"            component={OrdersScreen}            />
        <Stack.Screen name="Favorites"         component={FavoritesScreen}         />
        <Stack.Screen name="CreateListing"     component={CreateListing}           />
        <Stack.Screen name="SellerDashboard"   component={SellerDashboard}         />
        <Stack.Screen name="Notifications"     component={Notifications}           />
        <Stack.Screen name="AllListings"       component={AllListings}             />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} />
        <Stack.Screen name="ChooseRole" component={ChooseRoleScreen} />
        <Stack.Screen name="LivreurDashboard" component={LivreurDashboardScreen} />
      </Stack.Navigator>
      <NotifBanner />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <LanguageProvider>
              <RootNavigator />
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}