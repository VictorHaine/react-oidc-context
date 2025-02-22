import { renderHook } from "@testing-library/react-hooks";

import { useAuth } from "../src/useAuth";
import { createWrapper } from "./helpers";

const settingsStub = { authority: "authority", client_id: "client", redirect_uri: "redirect" };

describe("useAuth", () => {
    it("should provide the auth context", async () => {
        // arrange
        const wrapper = createWrapper({ ...settingsStub });
        const { result, waitForNextUpdate } = renderHook(useAuth, { wrapper });
        await waitForNextUpdate();

        // assert
        expect(result.current).toBeDefined();
    });

    it("should throw with no provider", async () => {
        const { result } = renderHook(useAuth);

        // act
        try {
            await result.current.signinRedirect();
            fail("should not come here");
        }
        catch (err) {
            expect(err).toBeInstanceOf(Error);
            expect((err as Error).message).toContain("AuthProvider context is undefined, please verify you are calling useAuth() as child of a <AuthProvider> component.");
        }
    });
});
