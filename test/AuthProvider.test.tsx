import { renderHook } from "@testing-library/react-hooks";
import { mocked } from "jest-mock";
import { UserManager, User } from "@carbonext/oidc-client-ts";
import { act } from "react-test-renderer";

import { useAuth } from "../src/useAuth";
import { createWrapper } from "./helpers";

const settingsStub = { authority: "authority", client_id: "client", redirect_uri: "redirect" };
const user = { id_token: "__test_user__" } as User;

describe("AuthProvider", () => {
    it("should signinRedirect when asked", async () => {
        // arrange
        const wrapper = createWrapper({ ...settingsStub });
        const { waitForNextUpdate, result } = renderHook(() => useAuth(), {
            wrapper,
        });
        await waitForNextUpdate();
        expect(result.current.user).toBeUndefined();

        // act
        await act(() => result.current.signinRedirect());

        // assert
        expect(UserManager.prototype.signinRedirect).toHaveBeenCalled();
        expect(UserManager.prototype.getUser).toHaveBeenCalled();
    });

    it("should handle signinCallback success and call onSigninCallback", async () => {
        // arrange
        const onSigninCallback = jest.fn();
        window.history.pushState(
            {},
            document.title,
            "/?code=__test_code__&state=__test_state__",
        );
        expect(window.location.href).toBe(
            "https://www.example.com/?code=__test_code__&state=__test_state__",
        );

        const wrapper = createWrapper({ ...settingsStub, onSigninCallback });

        // act
        const { waitForNextUpdate } = renderHook(() => useAuth(), {
            wrapper,
        });
        await waitForNextUpdate();

        // assert
        expect(UserManager.prototype.signinCallback).toHaveBeenCalled();
        expect(onSigninCallback).toHaveBeenCalled();
    });

    it("should handle signinCallback errors and call onSigninCallback", async () => {
        // arrange
        const onSigninCallback = jest.fn();
        window.history.pushState(
            {},
            document.title,
            "/?error=__test_error__&state=__test_state__",
        );
        expect(window.location.href).toBe(
            "https://www.example.com/?error=__test_error__&state=__test_state__",
        );

        const wrapper = createWrapper({ ...settingsStub, onSigninCallback });

        // act
        const { waitForNextUpdate } = renderHook(() => useAuth(), {
            wrapper,
        });
        await waitForNextUpdate();

        // assert
        expect(UserManager.prototype.signinCallback).toHaveBeenCalled();
        expect(onSigninCallback).toHaveBeenCalled();
    });

    it("should handle removeUser and call onRemoveUser", async () => {
        // arrange
        const onRemoveUser = jest.fn();

        const wrapper = createWrapper({ ...settingsStub, onRemoveUser });
        const { waitForNextUpdate, result } = renderHook(() => useAuth(), {
            wrapper,
        });
        await waitForNextUpdate();

        // act
        await act(() => result.current.removeUser());

        // assert
        expect(UserManager.prototype.removeUser).toHaveBeenCalled();
        expect(onRemoveUser).toHaveBeenCalled();
    });

    it("should handle signoutRedirect and call onSignoutRedirect", async () => {
        // arrange
        const onSignoutRedirect = jest.fn();
        const wrapper = createWrapper({ ...settingsStub, onSignoutRedirect });
        const { waitForNextUpdate, result } = renderHook(() => useAuth(), {
            wrapper,
        });
        await waitForNextUpdate();

        // act
        await act(() => result.current.signoutRedirect());

        // assert
        expect(UserManager.prototype.signoutRedirect).toHaveBeenCalled();
        expect(onSignoutRedirect).toHaveBeenCalled();
    });

    it("should handle signoutPopup and call onSignoutPopup", async () => {
        // arrange
        const onSignoutPopup = jest.fn();
        const wrapper = createWrapper({ ...settingsStub, onSignoutPopup });
        const { waitForNextUpdate, result } = renderHook(() => useAuth(), {
            wrapper,
        });
        await waitForNextUpdate();

        // act
        await act(() => result.current.signoutPopup());

        // assert
        expect(UserManager.prototype.signoutPopup).toHaveBeenCalled();
        expect(onSignoutPopup).toHaveBeenCalled();
    });

    it("should get the user", async () => {
        // arrange
        mocked(UserManager.prototype).getUser.mockResolvedValueOnce(user);
        const wrapper = createWrapper({ ...settingsStub });

        // act
        const { waitForNextUpdate, result } = renderHook(() => useAuth(), {
            wrapper,
        });
        await waitForNextUpdate();

        // assert
        expect(result.current.user).toBe(user);
    });

    it("should use a custom UserManager implementation", async () => {
        // arrange
        class CustomUserManager extends UserManager { }
        CustomUserManager.prototype.signinRedirect = jest.fn().mockResolvedValue(undefined);

        const wrapper = createWrapper({ ...settingsStub, implementation: CustomUserManager });
        const { waitForNextUpdate, result } = renderHook(() => useAuth(), {
            wrapper,
        });
        await waitForNextUpdate();
        expect(result.current.user).toBeUndefined();

        // act
        await act(() => result.current.signinRedirect());

        // assert
        expect(UserManager.prototype.signinRedirect).not.toHaveBeenCalled();
        expect(CustomUserManager.prototype.signinRedirect).toHaveBeenCalled();
    });

    it("should should throw when no UserManager implementation exists", async () => {
        // arrange
        const wrapper = createWrapper({ ...settingsStub, implementation: null });
        const { result } = renderHook(() => useAuth(), {
            wrapper,
        });

        // act
        expect(() => result.current.signinRedirect())
        // assert
            .toThrow(Error);
        expect(UserManager.prototype.signinRedirect).not.toHaveBeenCalled();
    });

    it("should set isLoading to false after initializing", async () => {
        // arrange
        const wrapper = createWrapper({ ...settingsStub });
        const { waitForNextUpdate, result } = renderHook(() => useAuth(), {
            wrapper,
        });
        expect(result.current.isLoading).toBe(true);

        // act
        await waitForNextUpdate();

        // assert
        expect(result.current.isLoading).toBe(false);
    });

    it("should set isLoading to true during a navigation", async () => {
        // arrange
        let resolve: (value: User) => void;
        mocked(UserManager.prototype).signinPopup.mockReturnValue(new Promise((_resolve) => {
            resolve = _resolve;
        }));
        const wrapper = createWrapper({ ...settingsStub });
        const { waitForNextUpdate, result } = renderHook(() => useAuth(), {
            wrapper,
        });
        await waitForNextUpdate();
        expect(result.current.isLoading).toBe(false);

        // act
        void act(() => void result.current.signinPopup());

        // assert
        expect(result.current.isLoading).toBe(true);

        // act
        void act(() => resolve({} as User));
        await waitForNextUpdate();

        // assert
        expect(result.current.isLoading).toBe(false);
    });

    it("should set activeNavigator based on the most recent navigation", async () => {
        // arrange
        let resolve: (value: User) => void;
        mocked(UserManager.prototype).signinPopup.mockReturnValue(new Promise((_resolve) => {
            resolve = _resolve;
        }));
        const wrapper = createWrapper({ ...settingsStub });
        const { waitForNextUpdate, result } = renderHook(() => useAuth(), {
            wrapper,
        });
        expect(result.current.activeNavigator).toBe(undefined);

        // act
        void act(() => void result.current.signinPopup());

        // assert
        expect(result.current.activeNavigator).toBe("signinPopup");

        // act
        void act(() => resolve({} as User));
        await waitForNextUpdate();

        // assert
        expect(result.current.activeNavigator).toBe(undefined);
    });
});
